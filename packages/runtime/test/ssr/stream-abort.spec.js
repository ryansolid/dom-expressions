/**
 * @jest-environment node
 *
 * Client-disconnect containment for renderToStream.
 *
 * A `pipe` sink belongs to the integrator, and its `write` can throw once
 * the client is gone (e.g. a web-stream adapter whose `controller.enqueue`
 * raises ERR_INVALID_STATE after close). The dangerous call sites are the
 * deferred ones — `writeTasks` and late fragment flushes run from the
 * microtask queue, where an uncontained throw escapes as an unhandled
 * rejection and takes the host process down. A throwing sink must instead
 * read as disconnection: writes stop, and the render winds down rather
 * than keep computing fragments for a dead stream. Cancelling
 * `renderToStream(...).readable` mid-stream is the same disconnect signal
 * and gets the same teardown.
 */
import * as r from "../../src/server";
import { sharedConfig } from "rxcore";

function asyncError() {
  let resolve;
  const promise = new Promise(r => (resolve = r));
  const err = new Error("async");
  err._promise = promise;
  return { err, resolve };
}

// A shell with one genuinely-streamed boundary: the root hole gates the
// shell flush, the registered fragment resolves later, so its template and
// activation script are deferred post-shell writes.
function streamedFragmentRender(options) {
  const gate = asyncError();
  let calls = 0;
  let fragDone;
  const stream = r.renderToStream(() => {
    fragDone = sharedConfig.context.registerFragment("f1");
    return r.ssr`<div>${() => {
      if (++calls === 1) throw gate.err;
      return "shell";
    }}</div>`;
  }, options);
  setTimeout(() => gate.resolve(), 5);
  return { stream, resolveFragment: v => fragDone(v) };
}

function captureUnhandled(fn) {
  const unhandled = [];
  const onRejection = reason => unhandled.push(reason);
  const onException = err => unhandled.push(err);
  process.on("unhandledRejection", onRejection);
  process.on("uncaughtException", onException);
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      process.off("unhandledRejection", onRejection);
      process.off("uncaughtException", onException);
    })
    .then(() => unhandled);
}

describe("stream teardown on client disconnect", () => {
  it("contains a pipe sink throwing on a deferred write and stops writing", async () => {
    const writes = [];
    let endCalled = false;
    let throwCount = 0;
    const sink = {
      write(v) {
        // Let the fragment's <template> land, then blow up on the deferred
        // <script> flush (writeTasks) — the microtask-scheduled write where
        // an escape crashes the process.
        if (v.includes("$df(")) {
          throwCount++;
          throw new Error("ERR_INVALID_STATE: sink is closed");
        }
        writes.push(v);
      },
      end() {
        endCalled = true;
      }
    };

    const unhandled = await captureUnhandled(async () => {
      const { stream, resolveFragment } = streamedFragmentRender();
      stream.pipe(sink);
      // Let the shell flush, then resolve the streamed boundary against the
      // now-dead sink, then let all deferred machinery settle.
      await new Promise(resolve => setTimeout(resolve, 20));
      resolveFragment("<p>late</p>");
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(unhandled).toEqual([]);
    expect(throwCount).toBe(1);
    // The shell and the fragment template arrived; after the throw the sink
    // stopped receiving — no retry, no further scripts, no end().
    expect(writes.length).toBeGreaterThanOrEqual(1);
    expect(writes[0]).toContain("<div>");
    expect(writes.join("")).not.toContain("$df(");
    expect(endCalled).toBe(false);
  });

  it("readable.cancel() mid-stream stops output and abandons the render", async () => {
    let completedAll = false;
    const unhandled = await captureUnhandled(async () => {
      const { stream, resolveFragment } = streamedFragmentRender({
        onCompleteAll() {
          completedAll = true;
        }
      });
      const reader = stream.readable.getReader();
      // First chunk is the shell (the pending fragment renders its marker).
      const { value } = await reader.read();
      expect(value).toBeInstanceOf(Uint8Array);
      await reader.cancel("client went away");
      // The boundary resolves after the client is gone: nothing should be
      // computed to completion against the dead stream.
      await new Promise(resolve => setTimeout(resolve, 20));
      resolveFragment("<p>late</p>");
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(unhandled).toEqual([]);
    // The render wound down instead of finishing against a cancelled
    // stream: completion callbacks never fired.
    expect(completedAll).toBe(false);
  });
});
