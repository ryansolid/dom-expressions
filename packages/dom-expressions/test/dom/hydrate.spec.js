/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import { sharedConfig } from "../core";
import * as S from "s-js";

describe("hydrating insert", () => {
  afterEach(() => {
    sharedConfig.context = undefined;
    document.body.innerHTML = "";
  });

  // Regression for solidjs/solid-start#2297: a streamed Suspense boundary whose
  // placeholder is swapped out by the server's replace script ($df) after the
  // parent insert captured it. Hydrating the boundary's content must recover the
  // live DOM range, otherwise `current` keeps detached nodes and a later update
  // (e.g. route change) can't remove the streamed content.
  it("recovers current after a streamed placeholder is replaced", () => {
    const parent = document.createElement("div");
    parent.innerHTML = `<!--$--><template id="pl-0"></template><p>Loading...</p><!--pl-0--><!--/-->`;
    document.body.appendChild(parent);
    const [start, template, placeholder, plComment, marker] = parent.childNodes;

    sharedConfig.context = { id: "", count: 0 };
    const [content, setContent] = createSignal(null);
    // what getNextMarker hands to insert: the nodes between the "$" and "/" markers
    S.root(() => r.insert(parent, content, marker, [template, placeholder, plComment]));

    // the server's $df script replaces the placeholder with the streamed content
    const img = document.createElement("img");
    template.remove();
    placeholder.remove();
    plComment.replaceWith(document.createTextNode("hi"), img);
    expect(parent.innerHTML).toBe(`<!--$-->hi<img><!--/-->`);

    // the boundary hydrates: a leading text node can't be claimed from the registry
    setContent(["hi", img]);
    expect(parent.innerHTML).toBe(`<!--$-->hi<img><!--/-->`);

    // hydration over; a later update must replace the streamed nodes, not append after them
    sharedConfig.context = undefined;
    const next = document.createElement("p");
    next.textContent = "Home";
    setContent([next]);
    expect(parent.innerHTML).toBe(`<!--$--><p>Home</p><!--/-->`);
    expect(start.parentNode).toBe(parent);
  });

  it("still returns current when no marker range is available", () => {
    const parent = document.createElement("div");
    parent.innerHTML = `<span>a</span>`;
    document.body.appendChild(parent);
    const stale = document.createElement("b");
    sharedConfig.context = { id: "", count: 0 };
    const res = r.insert(parent, ["x"], null, [stale]);
    expect(res).toEqual([stale]);
    expect(parent.innerHTML).toBe(`<span>a</span>`);
  });
});

function createSignal(init) {
  const v = S.value(init);
  return [v, v];
}
