/**
 * @jest-environment jsdom
 *
 * Server half of useHead (docs/head-management-rfc.md): first-flush
 * rendering into <head>, the charset/base prelude, eager resource-class
 * emission, evaluation-at-boundary-flush timing, and streamed head patches
 * riding their fragment's reveal.
 */
import * as r from "../../src/server";
import { sharedConfig } from "../core";

function pipeToString(stream) {
  return new Promise(resolve => {
    const chunks = [];
    stream.pipe({
      write(v) {
        chunks.push(v);
      },
      end() {
        resolve(chunks.join(""));
      }
    });
  });
}

const DOC = () => r.ssr`<html><head></head><body><div>app</div></body></html>`;

describe("renderToString head rendering", () => {
  it("renders a registered title into head with an ownership marker", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "title", props: { children: "Store" } });
      return DOC();
    });
    expect(html).toContain('<title data-dh="title">Store</title>');
    expect(html.indexOf("<title")).toBeLessThan(html.indexOf("</head>"));
  });

  it("last-committed registration wins per identity (title is a hard singleton)", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "title", props: { children: "Shell" } });
      r.useHead({ tag: "title", props: { children: "Page" }, key: "cannot-fork" });
      return DOC();
    });
    expect(html).toContain(">Page</title>");
    expect(html).not.toContain(">Shell</title>");
    expect(html.match(/<title/g).length).toBe(1);
  });

  it("dedupes meta by name and keeps distinct identities apart", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "meta", props: { name: "description", content: "one" } });
      r.useHead({ tag: "meta", props: { name: "description", content: "two" } });
      r.useHead({ tag: "meta", props: { property: "og:title", content: "OG" } });
      return DOC();
    });
    expect(html).not.toContain('content="one"');
    expect(html).toContain(
      '<meta name="description" content="two" data-dh="meta:name:description">'
    );
    expect(html).toContain(
      '<meta property="og:title" content="OG" data-dh="meta:property:og:title">'
    );
  });

  it("replaces a whole identity set with the later group (og:image set replacement)", () => {
    const html = r.renderToString(() => {
      r.useHead([
        { tag: "meta", props: { property: "og:image", content: "/a.png" } },
        { tag: "meta", props: { property: "og:image", content: "/b.png" } }
      ]);
      r.useHead([
        { tag: "meta", props: { property: "og:image", content: "/c.png" } },
        { tag: "meta", props: { name: "author", content: "me" } }
      ]);
      return DOC();
    });
    expect(html).not.toContain("/a.png");
    expect(html).not.toContain("/b.png");
    expect(html).toContain('content="/c.png"');
    expect(html).toContain('name="author"');
  });

  it("explicit keys unify identities that would otherwise differ", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "meta", props: { name: "twitter:image", content: "/t.png" }, key: "img" });
      r.useHead({ tag: "meta", props: { property: "og:image", content: "/og.png" }, key: "img" });
      return DOC();
    });
    expect(html).not.toContain("/t.png");
    expect(html).toContain("/og.png");
  });

  it("splices charset and base into the prelude right after the head open tag", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "meta", props: { name: "description", content: "d" } });
      r.useHead({ tag: "meta", props: { charset: "utf-8" } });
      r.useHead({ tag: "base", props: { href: "/app/" } });
      return r.ssr`<html><head><link rel="x" href="/x"></head><body></body></html>`;
    });
    const headOpen = html.indexOf("<head>") + "<head>".length;
    expect(html.slice(headOpen)).toMatch(/^<meta charset="utf-8"[^>]*><base href="\/app\/"[^>]*>/);
    // Regular tags still splice before </head>, after existing content.
    expect(html.indexOf('rel="x"')).toBeLessThan(html.indexOf("description"));
  });

  it("evaluates replaceable props getters exactly once, at flush", () => {
    let calls = 0;
    let collected = "a";
    const html = r.renderToString(() => {
      r.useHead({
        tag: "style",
        props: {
          children: () => {
            calls++;
            return collected;
          }
        },
        key: "collector"
      });
      // The collection window is the rest of the render (CSS-in-JS pattern).
      collected += "b";
      return DOC();
    });
    expect(calls).toBe(1);
    expect(html).toContain(">ab</style>");
  });

  it("escapes title text, attribute values, and inline bodies", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "title", props: { children: `<script>"x"` } });
      r.useHead({ tag: "meta", props: { name: "d", content: `"quoted" & <tag>` } });
      r.useHead({
        tag: "script",
        props: { type: "application/ld+json", children: `{"a":"</script>"}` },
        key: "ld"
      });
      r.useHead({ tag: "style", props: { children: "a</style><script>" }, key: "s" });
      return DOC();
    });
    expect(html).toContain('>&lt;script>"x"</title>');
    expect(html).toContain('content="&quot;quoted&quot; &amp; <tag>"');
    expect(html).toContain('{"a":"<\\/script>"}');
    expect(html).toContain("a<\\/style><script>");
  });

  it("rejects non-head tags and invalid attribute names", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const html = r.renderToString(() => {
      r.useHead({ tag: "div", props: { id: "nope" } });
      r.useHead({ tag: "meta", props: { name: "ok", content: "v", '"><script': "x" } });
      return DOC();
    });
    expect(html).not.toContain("nope");
    expect(html).not.toContain("script>x");
    expect(html).toContain('name="ok"');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("emits resource-class tags eagerly with identity dedupe", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "link", props: { rel: "preload", href: "/hero.jpg", as: "image" } });
      r.useHead({ tag: "link", props: { rel: "preload", href: "/hero.jpg", as: "image" } });
      // Same URL, different qualifier: a different resource.
      r.useHead({ tag: "link", props: { rel: "preload", href: "/hero.jpg", as: "fetch" } });
      return DOC();
    });
    expect(html.match(/href="\/hero\.jpg"/g).length).toBe(2);
    expect(html).toContain('as="image"');
    expect(html).toContain('as="fetch"');
  });

  it("routes plain stylesheet links through shared asset tracking (single identity set)", () => {
    const html = r.renderToString(() => {
      const ctx = sharedConfig.context;
      // Manifest-style registration first…
      ctx.registerAsset("style", "/route.css");
      // …then a user-authored link for the same URL must not duplicate it.
      r.useHead({ tag: "link", props: { rel: "stylesheet", href: "/route.css" } });
      return DOC();
    });
    expect(html.match(/href="\/route\.css"/g).length).toBe(1);
    expect(html).toContain('<link rel="stylesheet" href="/route.css">');
  });

  it("treats query-stringed CSS URLs as stylesheets (dev-server ?t=/?url paths)", () => {
    const html = r.renderToString(() => {
      const ctx = sharedConfig.context;
      r.useHead({ tag: "link", props: { rel: "stylesheet", href: "/src/foo.css?t=123" } });
      // The raw tracked path must classify the same way.
      ctx.registerAsset("style", "/src/bar.css?used");
      return DOC();
    });
    expect(html).toContain('<link rel="stylesheet" href="/src/foo.css?t=123">');
    expect(html).toContain('<link rel="stylesheet" href="/src/bar.css?used">');
    expect(html).not.toContain("modulepreload");
  });

  it("keeps qualifying attributes on attributed stylesheets", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "link", props: { rel: "stylesheet", href: "/print.css", media: "print" } });
      return DOC();
    });
    expect(html).toContain('media="print"');
  });

  it("passes body-only renders through untouched when nothing registers", () => {
    const html = r.renderToString(() => r.ssr`<div>plain</div>`);
    expect(html).toBe("<div>plain</div>");
  });

  it("drops head tags when the document has no head, without crashing", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "title", props: { children: "T" } });
      return r.ssr`<div>no head</div>`;
    });
    expect(html).toContain("<div>no head</div>");
    expect(html).not.toContain("<title");
  });
});

describe("renderToStream head patches", () => {
  it("parks boundary head ops on _$HY.hp for the fragment's $df reveal", async () => {
    let done;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        r.useHead({ tag: "title", props: { children: "Shell" } });
        done = ctx.registerFragment("hf1");
        ctx._currentBoundaryId = "hf1";
        r.useHead({ tag: "title", props: { children: "Page" } });
        ctx._currentBoundaryId = null;
        setTimeout(() => done("<span>content</span>"), 10);
        return r.ssr`<html><head></head><body><div><template id="pl-hf1"></template><!--pl-hf1--></div></body></html>`;
      })
    );
    // Shell flushed with the shell winner only.
    expect(html).toContain('<title data-dh="title">Shell</title>');
    expect(html).not.toContain(">Page</title>");
    // Patch ops park on the fragment key and precede its activation.
    const hpIdx = html.indexOf('(_$HY.hp=_$HY.hp||{})["hf1"]=[["t","Page"]]');
    expect(hpIdx).toBeGreaterThan(-1);
    expect(html.indexOf('$df("hf1")')).toBeGreaterThan(hpIdx);
    // The head patch runtime rode along, and $df grew the hp hook.
    expect(html).toContain("function $dha(");
    expect(html).toContain("_$HY.hp&&_$HY.hp[e]&&($dh(_$HY.hp[e]),delete _$HY.hp[e])");
  });

  it("assigns commit order by flush order, not registration order (reverse completion)", async () => {
    let doneA, doneB;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        doneA = ctx.registerFragment("ra");
        ctx._currentBoundaryId = "ra";
        r.useHead({ tag: "title", props: { children: "A" } });
        ctx._currentBoundaryId = null;
        doneB = ctx.registerFragment("rb");
        ctx._currentBoundaryId = "rb";
        r.useHead({ tag: "title", props: { children: "B" } });
        ctx._currentBoundaryId = null;
        // B completes first, then A: A is the later commit and must win.
        setTimeout(() => {
          doneB("<span>b</span>");
          setTimeout(() => doneA("<span>a</span>"), 10);
        }, 10);
        return r.ssr`<html><head></head><body><div><template id="pl-ra"></template><!--pl-ra--><template id="pl-rb"></template><!--pl-rb--></div></body></html>`;
      })
    );
    const bPatch = html.indexOf('["rb"]=[["t","B"]]');
    const aPatch = html.indexOf('["ra"]=[["t","A"]]');
    expect(bPatch).toBeGreaterThan(-1);
    expect(aPatch).toBeGreaterThan(bPatch);
  });

  it("evaluates boundary getters at fragment flush (collection window stays open)", async () => {
    let done;
    let calls = 0;
    let collected = "x";
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("cw");
        ctx._currentBoundaryId = "cw";
        r.useHead({
          tag: "style",
          props: {
            children: () => {
              calls++;
              return collected;
            }
          },
          key: "collector"
        });
        ctx._currentBoundaryId = null;
        setTimeout(() => {
          // More CSS collected long after registration, before the flush.
          collected += "y";
          done("<span>c</span>");
        }, 10);
        return r.ssr`<html><head></head><body><div><template id="pl-cw"></template><!--pl-cw--></div></body></html>`;
      })
    );
    expect(calls).toBe(1);
    expect(html).toContain('"xy"');
  });

  it("commits pre-shell-resolved boundaries with the shell (no patch script)", async () => {
    let done;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("ps");
        ctx._currentBoundaryId = "ps";
        r.useHead({ tag: "title", props: { children: "Instant" } });
        ctx._currentBoundaryId = null;
        // Resolves before first flush: inlines into the shell.
        done("<span>fast</span>");
        return r.ssr`<html><head></head><body><div><template id="pl-ps"></template><!--pl-ps--></div></body></html>`;
      })
    );
    expect(html).toContain('<title data-dh="title">Instant</title>');
    expect(html).not.toContain("_$HY.hp");
  });

  it("flushes an absorbed child's registrations at the parent's flush", async () => {
    let resolveParent, resolveChild;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        resolveParent = ctx.registerFragment("pa");
        resolveChild = ctx.registerFragment("pa-child");
        ctx._currentBoundaryId = "pa-child";
        r.useHead({ tag: "meta", props: { name: "child-meta", content: "c" } });
        ctx._currentBoundaryId = null;
        setTimeout(() => {
          resolveChild("<span>child</span>");
          resolveParent('<i>parent<template id="pl-pa-child"></template><!--pl-pa-child--></i>');
        }, 10);
        return r.ssr`<html><head></head><body><div><template id="pl-pa"></template><!--pl-pa--></div></body></html>`;
      })
    );
    // Ops ride the parent key — the boundary that actually flushed.
    expect(html).toContain(
      '["pa"]=[["a","meta:name:child-meta","meta",{"name":"child-meta","content":"c"},null]]'
    );
    expect(html).not.toContain('["pa-child"]=');
  });

  it("drops head registrations from errored boundaries", async () => {
    let done;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("ef");
        ctx._currentBoundaryId = "ef";
        r.useHead({ tag: "title", props: { children: "Broken" } });
        ctx._currentBoundaryId = null;
        setTimeout(() => done(undefined, new Error("boom")), 10);
        return r.ssr`<html><head></head><body><div><template id="pl-ef"></template><!--pl-ef--></div></body></html>`;
      })
    );
    expect(html).not.toContain("Broken");
    // No ops parked for the errored fragment (the $df runtime's own hook
    // text mentions _$HY.hp, so assert on the assignment).
    expect(html).not.toContain('["ef"]=');
  });

  it("streams post-shell resource tags eagerly, not with their boundary", async () => {
    let done;
    let ctx;
    const html = await pipeToString(
      r.renderToStream(() => {
        ctx = sharedConfig.context;
        done = ctx.registerFragment("rf");
        setTimeout(() => {
          ctx._currentBoundaryId = "rf";
          ctx.registerHeadTags([
            { tag: "link", props: { rel: "preload", href: "/late.woff2", as: "font" } }
          ]);
          ctx._currentBoundaryId = null;
          setTimeout(() => done("<span>done</span>"), 10);
        }, 10);
        return r.ssr`<html><head></head><body><div><template id="pl-rf"></template><!--pl-rf--></div></body></html>`;
      })
    );
    const linkIdx = html.indexOf('<link rel="preload" href="/late.woff2" as="font">');
    expect(linkIdx).toBeGreaterThan(-1);
    // Emitted as literal markup ahead of the fragment's template payload.
    expect(linkIdx).toBeLessThan(html.indexOf('<template id="rf">'));
  });

  it("ignores charset/base registered after the shell flushed", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    let done;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("cs");
        ctx._currentBoundaryId = "cs";
        ctx.registerHeadTags([{ tag: "meta", props: { charset: "latin1" } }]);
        ctx._currentBoundaryId = null;
        setTimeout(() => done("<span>x</span>"), 10);
        return r.ssr`<html><head></head><body><div><template id="pl-cs"></template><!--pl-cs--></div></body></html>`;
      })
    );
    expect(html).not.toContain("latin1");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("after shell flush"));
    warn.mockRestore();
  });

  it("escapes closing-script sequences in patch payloads", async () => {
    let done;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("xs");
        ctx._currentBoundaryId = "xs";
        r.useHead({ tag: "title", props: { children: "a</script><b>" } });
        ctx._currentBoundaryId = null;
        setTimeout(() => done("<span>x</span>"), 10);
        return r.ssr`<html><head></head><body><div><template id="pl-xs"></template><!--pl-xs--></div></body></html>`;
      })
    );
    expect(html).toContain("\\u003C/script>\\u003Cb>");
    expect(html).not.toContain('=[["t","a</script>');
  });
});
