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
    // Formerly the spike-documented re-call edge: streams re-send slot
    // chunks and re-call triggered on record identity. The store-write
    // dedupe fixes it for primitive and {$frame} args — this occurrence's
    // args are pure primitives, so the node survives the navigation.
    // ({$ref} codec args still conservatively re-call.)
    expect(boundary.querySelector("li")).toBe(firstLi);
    expect([...boundary.querySelectorAll("li")].map(li => li.textContent)).toEqual([
      "first!",
      "nice <script>"
    ]);
  });

  it("$key on a DOM element is inert: just an attribute, no occurrence semantics", async () => {
    // $key names occurrences on PROJECTION CALLS only. Server elements have
    // no identity to name, so on an element it compiles to a plain attribute
    // and nothing else.
    const comp = props => (
      <div $key="c1">
        <span>{props.label({ $key: "c1", text: "hi" })}</span>
      </div>
    );
    const host = createFrameHost();
    const seen = [];
    createFrame(boundary, {
      host,
      id: "inert",
      slots: {
        label: p => {
          seen.push(p.text);
          const b = document.createElement("b");
          b.textContent = p.text;
          return b;
        }
      }
    });
    await streamInto(renderServerComponent(comp, { frame: { id: "inert", version: 1 } }), host);
    expect(boundary.querySelector("div").getAttribute("$key")).toBe("c1");
    // The projection call next to it still keyed normally.
    expect(seen).toEqual(["hi"]);
    expect(boundary.querySelector("span b").textContent).toBe("hi");
  });
});
