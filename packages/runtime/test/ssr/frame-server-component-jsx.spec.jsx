/**
 * @jest-environment jsdom
 */
// The server-component convention with REAL JSX: this file goes through the
// babel SSR transform, so the component below is authored the way a `use
// server` function's return value would be — proving the projection props
// proxy works against actual compiler output, not just hand-written r.ssr
// calls.
import { renderServerComponent } from "../../src/frame-sink";
import { createJSONDataTable } from "../../src/serializer";
import { createFrame, createFrameHost } from "../../src/frame-client";

function streamInto(stream, host) {
  return new Promise(resolve => {
    stream.pipe({ write: c => host.apply(c), end: resolve });
  });
}

describe("server component authored in JSX", () => {
  let boundary;
  beforeEach(() => {
    boundary = document.createElement("div");
    document.body.appendChild(boundary);
  });
  afterEach(() => boundary.remove());

  it("renders JSX markup, dynamic values, projections, and render props end to end", async () => {
    // What a server function would build and return: server data closed
    // over, client positions expressed as props.
    const makeServerComp = (title, comments) => props => (
      <article class="story">
        <h1>{title}</h1>
        <ul>{comments.map(text => props.comment({ text }))}</ul>
        <footer>{props.children}</footer>
      </article>
    );

    const table = createJSONDataTable();
    const host = createFrameHost({
      applyData: c => table.apply(c),
      resolve: ref => table.resolve(ref)
    });
    const seen = [];
    const badge = document.createElement("button");
    badge.textContent = "reply";
    createFrame(boundary, {
      host,
      id: "story",
      slots: {
        comment: props => {
          seen.push(props.text);
          const li = document.createElement("li");
          li.textContent = props.text;
          return li;
        },
        children: () => badge
      }
    });

    await streamInto(
      renderServerComponent(makeServerComp("Show HN", ["first!", "nice <script>"]), {
        frame: { id: "story", version: 1 }
      }),
      host
    );

    expect(boundary.querySelector("h1").textContent).toBe("Show HN");
    // One occurrence per render-prop call, in order, args over the wire.
    expect(seen).toEqual(["first!", "nice <script>"]);
    expect([...boundary.querySelectorAll("li")].map(li => li.textContent)).toEqual([
      "first!",
      "nice <script>"
    ]);
    // Direct-insert projection filled by the client.
    expect(boundary.querySelector("footer button")).toBe(badge);

    // Navigation: same boundary, new server data — client content survives.
    badge.dataset.clicked = "yes";
    const firstLi = boundary.querySelector("li");
    await streamInto(
      renderServerComponent(makeServerComp("Show HN (edited)", ["first!", "nice <script>"]), {
        frame: { id: "story", version: 2 }
      }),
      host
    );
    expect(boundary.querySelector("h1").textContent).toBe("Show HN (edited)");
    expect(boundary.querySelector("footer button")).toBe(badge);
    expect(badge.dataset.clicked).toBe("yes");
    // Known open edge (spike-documented): re-call triggers on slot-record
    // identity, and a stream re-sends its slot chunks, so render-prop
    // occurrences re-call on every navigation even with unchanged args —
    // content is correct but node identity is not preserved. Direct-insert
    // slots (no record) are unaffected. Fix direction: value-equality or
    // record dedupe on the slot store write.
    expect(boundary.querySelector("li")).not.toBe(firstLi);
    expect([...boundary.querySelectorAll("li")].map(li => li.textContent)).toEqual([
      "first!",
      "nice <script>"
    ]);
  });
});
