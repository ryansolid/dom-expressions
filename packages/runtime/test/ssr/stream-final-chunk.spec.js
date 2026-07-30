/**
 * @jest-environment node
 *
 * `pipeTo` must not release the writer's lock (or close the stream) while a
 * write it issued is still in flight.
 *
 * `buffer.write` calls `writer.write()` without awaiting the returned promise,
 * and `writable.end()` then calls `writer.releaseLock()` synchronously. Whether
 * the in-flight chunk survives that is up to the host's stream implementation:
 * Node's queues it anyway, but workerd drops it. The chunk at risk is always
 * the last one, which for a streamed boundary is its `<id>_fr` resolution
 * script — and losing that leaves the client's boundary waiting on a promise
 * that never resolves. It renders its fallback into detached DOM, the streamed
 * server content is never claimed, and every binding inside the boundary is
 * dead after hydration (plain signals included).
 *
 * Observed with `@tanstack/solid-router` on Cloudflare Workers: the `$df(...)`
 * reveal arrived but `$R[n]($R[m],!0)` never did.
 *
 * The existing `pipeToWritable` spec passes a writer whose `write()` returns an
 * already-resolved promise, so nothing is ever in flight and this never shows
 * up. Asserting the invariant directly keeps the guard platform-independent.
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

// Models a sink that doesn't settle writes synchronously — i.e. any real
// stream applying backpressure — and records how many writes were still in
// flight when the lock was released.
function createBackpressuredSink() {
  const chunks = [];
  const decoder = new TextDecoder();
  let inFlight = 0;
  const state = { inFlightAtRelease: null };
  const writable = {
    getWriter() {
      return {
        write(v) {
          inFlight++;
          return new Promise(resolve =>
            setTimeout(() => {
              inFlight--;
              chunks.push(typeof v === "string" ? v : decoder.decode(v));
              resolve();
            }, 0)
          );
        },
        releaseLock() {
          state.inFlightAtRelease = inFlight;
        }
      };
    },
    close() {
      return Promise.resolve();
    }
  };
  return { chunks, writable, state };
}

describe("pipeTo with a backpressured sink", () => {
  it("awaits in-flight writes before releasing the writer", async () => {
    const { chunks, writable, state } = createBackpressuredSink();
    const pending = asyncError();
    let calls = 0;
    let fragDone;

    const stream = r.renderToStream(() => {
      fragDone = sharedConfig.context.registerFragment("f1");
      return r.ssr`<div>${() => {
        if (++calls === 1) throw pending.err;
        return "shell";
      }}</div>`;
    });

    setTimeout(() => pending.resolve(), 5);
    setTimeout(() => fragDone("<p>late</p>"), 20);

    await stream.pipeTo(writable);
    await new Promise(resolve => setTimeout(resolve, 50));

    // The fragment's reveal and its `_fr` resolution both belong on the wire.
    const html = chunks.join("");
    expect(html).toContain('$df("f1")');
    expect(html).toMatch(/,!0\)/);

    // ...and the lock must not have been released with a write still pending,
    // or hosts with stricter stream semantics lose that chunk.
    expect(state.inFlightAtRelease).toBe(0);
  });
});
