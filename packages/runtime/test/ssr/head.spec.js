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

  it("resolves function-form group membership at flush (composed after registration)", () => {
    const html = r.renderToString(() => {
      // The component-grouping pattern: the group registers before its
      // members exist; children push during their own render.
      const members = [];
      r.useHead(() => members);
      members.push({ tag: "meta", props: { property: "og:image", content: "/a.png" } });
      members.push({ tag: "meta", props: { property: "og:image", content: "/b.png" } });
      return DOC();
    });
    expect(html).toContain('content="/a.png"');
    expect(html).toContain('content="/b.png"');
  });

  it("keeps a function-form group's commit position (registration order, not flush order)", () => {
    const html = r.renderToString(() => {
      const members = [];
      r.useHead(() => members);
      r.useHead({ tag: "title", props: { children: "Later" } });
      members.push({ tag: "title", props: { children: "Group" } });
      return DOC();
    });
    expect(html).toContain(">Later</title>");
    expect(html).not.toContain(">Group</title>");
  });

  it("emits resource tags found in a function-form group at flush", () => {
    const html = r.renderToString(() => {
      const members = [];
      r.useHead(() => members);
      members.push({ tag: "link", props: { rel: "preload", href: "/hero.jpg", as: "image" } });
      members.push({ tag: "meta", props: { name: "description", content: "d" } });
      return DOC();
    });
    expect(html).toContain('<link rel="preload" href="/hero.jpg" as="image">');
    expect(html).toContain('name="description"');
  });

  it("forks meta identity by media (theme-color light/dark coexist)", () => {
    const html = r.renderToString(() => {
      r.useHead({
        tag: "meta",
        props: { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#fff" }
      });
      r.useHead({
        tag: "meta",
        props: { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#000" }
      });
      // Same name + same media still dedupes last-wins.
      r.useHead({
        tag: "meta",
        props: { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#111" }
      });
      return DOC();
    });
    expect(html).toContain('content="#fff"');
    expect(html).not.toContain('content="#000"');
    expect(html).toContain('content="#111"');
    expect(html.match(/name="theme-color"/g).length).toBe(2);
  });

  it("treats icons as replaceable (identity excludes href): swapped href replaces", () => {
    const html = r.renderToString(() => {
      r.useHead({ tag: "link", props: { rel: "icon", href: "/favicon.ico" } });
      r.useHead({ tag: "link", props: { rel: "icon", href: "/favicon-alert.ico" } });
      // Variants with sizes/type are separate identities and coexist.
      r.useHead({
        tag: "link",
        props: { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }
      });
      r.useHead({ tag: "link", props: { rel: "apple-touch-icon", href: "/apple.png" } });
      return DOC();
    });
    expect(html).not.toContain("/favicon.ico");
    expect(html).toContain('href="/favicon-alert.ico"');
    expect(html).toContain('data-dh="link:icon"');
    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('data-dh="link:icon:type=image/svg+xml"');
    expect(html).toContain('href="/apple.png"');
    expect(html).toContain('data-dh="link:apple-touch-icon"');
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

  it("emits fetch-metadata-attributed stylesheets into the head", () => {
    const html = r.renderToString(() => {
      r.useHead({
        tag: "link",
        props: {
          rel: "stylesheet",
          href: "https://cdn.example.com/x.css",
          crossorigin: "anonymous",
          integrity: "sha384-abc"
        }
      });
      return DOC();
    });
    expect(html).toContain(
      '<link rel="stylesheet" href="https://cdn.example.com/x.css" crossorigin="anonymous" integrity="sha384-abc">'
    );
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

describe("onHead (embedded renders, host-owned document)", () => {
  it("delivers head-bound output to onHead when the render has no </head>", () => {
    let head;
    const html = r.renderToString(
      () => {
        const ctx = sharedConfig.context;
        r.useHead([
          { tag: "meta", props: { charset: "utf-8" } },
          { tag: "title", props: { children: "Widget" } },
          { tag: "link", props: { rel: "preload", href: "/hero.jpg", as: "image" } }
        ]);
        ctx.registerAsset("style", "/widget.css");
        return r.ssr`<div>widget</div>`;
      },
      { onHead: h => (head = h) }
    );
    expect(html).toContain("<div>widget</div>");
    // Body untouched: nothing head-bound leaked into the fragment.
    expect(html).not.toContain("<title");
    // Prelude first, then resources/winners/tracked assets.
    expect(head.startsWith('<meta charset="utf-8"')).toBe(true);
    expect(head).toContain('<title data-dh="title">Widget</title>');
    expect(head).toContain('<link rel="preload" href="/hero.jpg" as="image">');
    expect(head).toContain('<link rel="stylesheet" href="/widget.css">');
  });

  it("calls onHead with an empty string when nothing registered (mode signal)", () => {
    let head;
    r.renderToString(() => r.ssr`<div>plain</div>`, { onHead: h => (head = h) });
    expect(head).toBe("");
  });

  it("does not call onHead when the render owns its document", () => {
    let called = false;
    const html = r.renderToString(
      () => {
        r.useHead({ tag: "title", props: { children: "Doc" } });
        return DOC();
      },
      { onHead: () => (called = true) }
    );
    expect(called).toBe(false);
    expect(html).toContain('<title data-dh="title">Doc</title>');
  });

  it("streams: delivers shell head before the first chunk; patches still ride the stream", async () => {
    const sequence = [];
    let done;
    const stream = r.renderToStream(
      () => {
        const ctx = sharedConfig.context;
        r.useHead({ tag: "title", props: { children: "Shell" } });
        done = ctx.registerFragment("eh1");
        ctx._currentBoundaryId = "eh1";
        r.useHead({ tag: "title", props: { children: "Page" } });
        ctx._currentBoundaryId = null;
        setTimeout(() => done("<span>content</span>"), 10);
        return r.ssr`<div><template id="pl-eh1"></template><!--pl-eh1--></div>`;
      },
      { onHead: h => sequence.push(["head", h]) }
    );
    const html = await new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          sequence.push(["chunk", v]);
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
    expect(html).toContain("<span>content</span>");
    // Head delivered first, before any chunk hit the writer.
    expect(sequence[0][0]).toBe("head");
    expect(sequence[0][1]).toContain('<title data-dh="title">Shell</title>');
    expect(sequence[1][0]).toBe("chunk");
    // The boundary's retitle still parks on the fragment reveal via the stream.
    expect(html).toContain('["eh1"]=[["t","Page"]]');
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

  it("gates fragment reveal on fetch-metadata-attributed stylesheets", async () => {
    let done;
    let ctx;
    const html = await pipeToString(
      r.renderToStream(() => {
        ctx = sharedConfig.context;
        done = ctx.registerFragment("gs");
        setTimeout(() => {
          ctx._currentBoundaryId = "gs";
          ctx.registerHeadTags([
            {
              tag: "link",
              props: {
                rel: "stylesheet",
                href: "https://cdn.example.com/x.css",
                crossorigin: "anonymous",
                integrity: "sha384-abc"
              }
            },
            // Extensionless plain stylesheet: can't ride the tracked path's
            // suffix classification, gates through the same descriptor path.
            { tag: "link", props: { rel: "stylesheet", href: "/styles?theme=dark" } }
          ]);
          ctx._currentBoundaryId = null;
          setTimeout(() => done("<span>done</span>"), 10);
        }, 10);
        return r.ssr`<html><head></head><body><div><template id="pl-gs"></template><!--pl-gs--></div></body></html>`;
      })
    );
    expect(html).toContain('$dfs("gs",2');
    expect(html).toContain(
      '<link rel="stylesheet" href="https://cdn.example.com/x.css" crossorigin="anonymous" integrity="sha384-abc" onload="$dfc(\'gs\')" onerror="$dfc(\'gs\')">'
    );
    expect(html).toContain(
      '<link rel="stylesheet" href="/styles?theme=dark" onload="$dfc(\'gs\')" onerror="$dfc(\'gs\')">'
    );
    // Gated links precede the fragment payload, nothing emitted twice.
    expect(html.indexOf("cdn.example.com/x.css")).toBeLessThan(html.indexOf('<template id="gs">'));
    expect(html.match(/cdn\.example\.com\/x\.css/g).length).toBe(1);
  });

  it("does not gate reveal on condition-changing stylesheets (media)", async () => {
    let done;
    let ctx;
    const html = await pipeToString(
      r.renderToStream(() => {
        ctx = sharedConfig.context;
        done = ctx.registerFragment("gm");
        setTimeout(() => {
          ctx._currentBoundaryId = "gm";
          ctx.registerHeadTags([
            { tag: "link", props: { rel: "stylesheet", href: "/print.css", media: "print" } }
          ]);
          ctx._currentBoundaryId = null;
          setTimeout(() => done("<span>done</span>"), 10);
        }, 10);
        return r.ssr`<html><head></head><body><div><template id="pl-gm"></template><!--pl-gm--></div></body></html>`;
      })
    );
    expect(html).toContain('<link rel="stylesheet" href="/print.css" media="print">');
    expect(html).not.toContain('$dfs("gm"');
    expect(html).not.toContain("onload");
  });

  it("emits pre-shell attributed stylesheets in the shell head without re-gating", async () => {
    let done;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("ps");
        ctx._currentBoundaryId = "ps";
        r.useHead({
          tag: "link",
          props: { rel: "stylesheet", href: "/early.css", crossorigin: "anonymous" }
        });
        ctx._currentBoundaryId = null;
        setTimeout(() => done("<span>done</span>"), 10);
        return r.ssr`<html><head></head><body><div><template id="pl-ps"></template><!--pl-ps--></div></body></html>`;
      })
    );
    // Registered pre-shell: the link is render-blocking in the shell head…
    const linkIdx = html.indexOf(
      '<link rel="stylesheet" href="/early.css" crossorigin="anonymous">'
    );
    expect(linkIdx).toBeGreaterThan(-1);
    expect(linkIdx).toBeLessThan(html.indexOf("</head>"));
    // …so the fragment neither gates on it nor re-emits it.
    expect(html).not.toContain('$dfs("ps"');
    expect(html.match(/\/early\.css/g).length).toBe(1);
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

// Head props are lazy descriptors that nothing reads during render, so an
// async value in a tag's props would never suspend its enclosing Loading
// boundary — the pending read would surface only at flush and warn-drop the
// tag (solid #2975). During a Loading discovery pass (`_loadingPhase`, set by
// the reactive library's boundary runner) registration probes the descriptor
// and rethrows a NotReady so the boundary suspends; the retry re-registers
// with ready values.
describe("Loading discovery readiness probe", () => {
  // The test core's ssrHandleError answers `err._promise` (the seam the real
  // core uses to recognize NotReadyError and return its source promise).
  const pendingRead = () =>
    Object.assign(new Error("pending read"), { _promise: Promise.resolve() });

  it("rethrows pending prop reads during a Loading pass; the aborted pass registers nothing", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const nre = pendingRead();
    const html = r.renderToString(() => {
      const ctx = sharedConfig.context;
      ctx._loadingPhase = true;
      let caught;
      try {
        r.useHead({
          tag: "title",
          props: {
            children: () => {
              throw nre;
            }
          }
        });
      } catch (err) {
        caught = err;
      }
      ctx._loadingPhase = false;
      expect(caught).toBe(nre);
      // The boundary retry re-registers once the value settled:
      r.useHead({ tag: "title", props: { children: "Ready" } });
      return DOC();
    });
    expect(html).toContain(">Ready</title>");
    expect(html.match(/<title/g).length).toBe(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("probes the key getter too", () => {
    const nre = pendingRead();
    r.renderToString(() => {
      const ctx = sharedConfig.context;
      ctx._loadingPhase = true;
      let caught;
      try {
        r.useHead({
          tag: "meta",
          props: { name: "d", content: "v" },
          key: () => {
            throw nre;
          }
        });
      } catch (err) {
        caught = err;
      }
      ctx._loadingPhase = false;
      expect(caught).toBe(nre);
      return DOC();
    });
  });

  it("keeps warn-and-drop for pending reads outside a Loading pass (no retryable catch)", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const nre = pendingRead();
    const html = r.renderToString(() => {
      // Must not throw: outside a discovery pass there is nothing to
      // suspend — a rethrow would loop a wider re-rendering scope forever.
      r.useHead({
        tag: "title",
        props: {
          children: () => {
            throw nre;
          }
        }
      });
      return DOC();
    });
    expect(html).not.toContain("<title");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("error evaluating tag props"), nre);
    warn.mockRestore();
  });

  it("discards the probe's read: flush evaluation stays authoritative", () => {
    let calls = 0;
    const html = r.renderToString(() => {
      const ctx = sharedConfig.context;
      ctx._loadingPhase = true;
      r.useHead({
        tag: "title",
        props: { children: () => (++calls === 1 ? "probe" : "flush") }
      });
      ctx._loadingPhase = false;
      return DOC();
    });
    expect(calls).toBe(2);
    expect(html).toContain(">flush</title>");
  });

  it("suspends on pending resource props during a Loading pass (dedupe absorbs the retry)", () => {
    const nre = pendingRead();
    const html = r.renderToString(() => {
      const ctx = sharedConfig.context;
      ctx._loadingPhase = true;
      let caught;
      try {
        r.useHead({
          tag: "script",
          props: {
            src: () => {
              throw nre;
            }
          }
        });
      } catch (err) {
        caught = err;
      }
      ctx._loadingPhase = false;
      expect(caught).toBe(nre);
      // Retry with the settled URL: emitted once.
      r.useHead({ tag: "script", props: { src: "/app.js" } });
      r.useHead({ tag: "script", props: { src: "/app.js" } });
      return DOC();
    });
    expect(html.match(/src="\/app\.js"/g).length).toBe(1);
  });

  it("does not probe function-form groups (membership composes after registration)", () => {
    let calls = 0;
    r.renderToString(() => {
      const ctx = sharedConfig.context;
      ctx._loadingPhase = true;
      r.useHead(() => {
        calls++;
        return [];
      });
      expect(calls).toBe(0);
      ctx._loadingPhase = false;
      return DOC();
    });
    expect(calls).toBe(1); // resolved exactly once, at flush
  });
});
