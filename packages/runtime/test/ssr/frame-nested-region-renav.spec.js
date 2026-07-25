/**
 * @jest-environment jsdom
 */
// Regression (HN example): a comment region nested inside ANOTHER comment
// region is dropped when the story is navigated away from and back — but only
// after a DOCUMENT-ADOPT boot. At t=0 the document omits a USED region's
// `{$frame}` ref from the occurrence record (it shipped as inline markup), so
// the nested reply c2 boots with a PARTIAL record `{cid:"c2"}` and gets its
// region by DOM discovery. Navigating away tears c2's region down; its record
// lived in the ROOT store (nested occurrences are keyed on the root stream),
// and region teardown used to leave it stranded. Navigating back re-sends the
// FULL record, but the stale partial dedupes the re-introduced region away and
// c2 re-mounts with no children — its body vanishes. Top-level comments (the
// root frame's own #unmountSlot'd occurrences) always survive.
import { createFrame, createFrameHost, FRAME_TAG, FRAME_ID_ATTR } from "../../src/frame-client";

const FID = "f0";
const region = childId => `<${FRAME_TAG} ${FRAME_ID_ATTR}="${childId}" style="display:contents">`;
const endRegion = `</${FRAME_TAG}>`;

// t=0 document markup: client wrappers already rendered, each holding its body
// region as an inline element, c2's occurrence nested inside c1's region.
const ADOPT_HTML =
  `<article><h1>One</h1><section class="comments">` +
  `<!--slot:comment#c1:start--><div class="comment" data-cid="c1">${region("f0.comment#c1.children")}` +
  `<div class="body"><p>c1-alpha</p><div class="replies">` +
  `<!--slot:comment#c2:start--><div class="comment" data-cid="c2">${region("f0.comment#c2.children")}` +
  `<div class="body"><p>c2-bravo</p><div class="replies"></div></div>${endRegion}` +
  `</div><!--slot:comment#c2:end-->` +
  `</div></div>${endRegion}</div><!--slot:comment#c1:end-->` +
  `<!--slot:comment#c4:start--><div class="comment" data-cid="c4">${region("f0.comment#c4.children")}` +
  `<div class="body"><p>c4-charlie</p><div class="replies"></div></div>${endRegion}</div><!--slot:comment#c4:end-->` +
  `</section></article>`;

// A streamed navigation: shell + each comment's region html + a FULL slot
// record (children {$frame} re-introduced). Nested occurrence markers live in
// the parent region's html, deepest-first — the producer's shape.
function streamStory(host, version, title, comments) {
  host.apply({ type: "start", id: FID, version });
  // region html + slot for every comment (recursively), deepest-first
  const walk = c => {
    c.replies.forEach(walk);
    const childId = `f0.comment#${c.id}.children`;
    const replyMarkers = c.replies
      .map(r => `<!--slot:comment#${r.id}:start--><!--slot:comment#${r.id}:end-->`)
      .join("");
    host.apply({
      type: "html",
      id: childId,
      version,
      html: `<div class="body"><p>${c.text}</p><div class="replies">${replyMarkers}</div></div>`
    });
    host.apply({
      type: "slot",
      id: FID,
      version,
      key: `comment#${c.id}`,
      args: { cid: c.id, children: { $frame: childId } }
    });
  };
  comments.forEach(walk);
  const topMarkers = comments
    .map(c => `<!--slot:comment#${c.id}:start--><!--slot:comment#${c.id}:end-->`)
    .join("");
  host.apply({
    type: "html",
    id: FID,
    version,
    html: `<article><h1>${title}</h1><section class="comments">${topMarkers}</section></article>`
  });
  host.apply({ type: "complete", id: FID, version });
}

describe("nested region re-navigation after a document-adopt boot", () => {
  let boundary;
  beforeEach(() => {
    boundary = document.createElement("div");
    document.body.appendChild(boundary);
  });
  afterEach(() => boundary.remove());

  const slots = {
    comment: (p, ctx) => {
      // Adopt boot: the range already holds the server-rendered wrapper — claim
      // it in place. A post-boot stream ships bare marker pairs (empty range),
      // so build a fresh wrapper and hang the region under it. Gate on the
      // interior, not `ctx.adopted` (true for every mount on an adopt frame).
      if (ctx.existing && ctx.existing.length) return undefined;
      const wrap = document.createElement("div");
      wrap.className = "comment";
      wrap.dataset.cid = String(p.cid);
      if (p.children) wrap.appendChild(p.children);
      return wrap;
    }
  };

  const bodyText = cid =>
    boundary.querySelector(`.comment[data-cid="${cid}"] p`)?.textContent ?? null;

  it("keeps a doubly-nested reply across navigate-away-and-back (was dropped by a stale t=0 record)", () => {
    // --- t=0 document boot: seed PARTIAL records, adopt. The used children
    // region is omitted (it shipped as markup), but the `collapsed` arg is
    // armed even though it's undefined (`depth >= 2 || undefined` for a shallow
    // reply) — so the record is `{cid, collapsed:undefined}`, TWO keys. That
    // matches the re-sent `{cid, children:{$frame}}` key-count, defeating the
    // dedup's length guard: it then compares only the stale record's keys, sees
    // `collapsed` undefined on both sides, and never checks the added region.
    const host = createFrameHost();
    host.apply({ type: "start", id: FID, version: 1 });
    for (const cid of ["c1", "c2", "c4"]) {
      host.apply({
        type: "slot",
        id: FID,
        version: 1,
        key: `comment#${cid}`,
        args: { cid, collapsed: undefined }
      });
    }
    boundary.innerHTML = ADOPT_HTML;
    createFrame(boundary, { host, id: FID, adopt: true, slots });

    expect(bodyText("c1")).toBe("c1-alpha");
    expect(bodyText("c2")).toBe("c2-bravo"); // nested reply present at boot
    expect(bodyText("c4")).toBe("c4-charlie");

    // --- navigate away to an unrelated story (tears c1/c2/c4 down)
    streamStory(host, 2, "Two", [{ id: "z9", text: "z9-zulu", replies: [] }]);
    expect(bodyText("z9")).toBe("z9-zulu");

    // --- navigate back: full records re-sent
    streamStory(host, 3, "One", [
      { id: "c1", text: "c1-alpha", replies: [{ id: "c2", text: "c2-bravo", replies: [] }] },
      { id: "c4", text: "c4-charlie", replies: [] }
    ]);

    expect(bodyText("c1")).toBe("c1-alpha"); // top-level: always fine
    // The regression: the nested reply's body must come back.
    expect(bodyText("c2")).toBe("c2-bravo");
  });
});
