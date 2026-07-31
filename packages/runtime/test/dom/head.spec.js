/**
 * @jest-environment jsdom
 *
 * Client half of useHead (docs/head-management-rfc.md): last-committed-group
 * resolution, reactive updates keeping their commit position, disposal
 * restoring the previous winner (stack semantics for title), group set
 * replacement, ownership marking, and resource-class acquisition.
 *
 * The registry is a module singleton, so tests share state deliberately:
 * every test disposes its roots and awaits the flush microtask so it leaves
 * the registry empty. The static fallback title is installed before the
 * first registration and stays for the whole file.
 */
import * as r from "../../src/client";
import { createRoot, createSignal, flush } from "@solidjs/signals";

// Registry applies on a microtask.
const tick = () => Promise.resolve();

beforeAll(() => {
  document.head.innerHTML = "<title>Static</title>";
});

describe("useHead client registry", () => {
  it("applies title and meta with ownership markers, and restores on dispose", async () => {
    let dispose;
    createRoot(d => {
      dispose = d;
      r.useHead([
        { tag: "title", props: { children: "Page" } },
        { tag: "meta", props: { name: "description", content: "desc" } }
      ]);
    });
    await tick();
    expect(document.title).toBe("Page");
    const meta = document.head.querySelector('meta[name="description"]');
    expect(meta.getAttribute("content")).toBe("desc");
    expect(meta.getAttribute("data-dh")).toBe("meta:name:description");
    expect(document.querySelector("title").getAttribute("data-dh")).toBe("title");

    dispose();
    await tick();
    // All registrations gone: static fallback restored, owned tags removed.
    expect(document.title).toBe("Static");
    expect(document.querySelector("title").hasAttribute("data-dh")).toBe(false);
    expect(document.head.querySelector('meta[name="description"]')).toBe(null);
  });

  it("keeps the later commit as winner and restores the previous one on dispose", async () => {
    let disposeOuter, disposeInner;
    createRoot(d => {
      disposeOuter = d;
      r.useHead({ tag: "title", props: { children: "Outer" } });
      createRoot(d2 => {
        disposeInner = d2;
        r.useHead({ tag: "title", props: { children: "Inner" } });
      });
    });
    await tick();
    expect(document.title).toBe("Inner");
    expect(document.querySelectorAll("title").length).toBe(1);

    disposeInner();
    await tick();
    // Commit order acts as the stack: previous winner restored.
    expect(document.title).toBe("Outer");

    disposeOuter();
    await tick();
    expect(document.title).toBe("Static");
  });

  it("updates reactively in place without losing commit position", async () => {
    let dispose, setName;
    createRoot(d => {
      dispose = d;
      const [name, set] = createSignal("First");
      setName = set;
      r.useHead({ tag: "title", props: { children: () => name() } });
      r.useHead({ tag: "title", props: { children: "Second" } });
    });
    await tick();
    expect(document.title).toBe("Second");

    // Updating the earlier registration must not promote it to latest.
    setName("First!");
    flush();
    await tick();
    expect(document.title).toBe("Second");

    dispose();
    await tick();
  });

  it("updates a solo reactive registration's rendered tag", async () => {
    let dispose, setDesc;
    createRoot(d => {
      dispose = d;
      const [desc, set] = createSignal("one");
      setDesc = set;
      r.useHead({ tag: "meta", props: { name: "reactive-desc", content: () => desc() } });
    });
    await tick();
    expect(document.head.querySelector('meta[name="reactive-desc"]').getAttribute("content")).toBe(
      "one"
    );

    setDesc("two");
    flush();
    await tick();
    const metas = document.head.querySelectorAll('meta[name="reactive-desc"]');
    expect(metas.length).toBe(1);
    expect(metas[0].getAttribute("content")).toBe("two");

    dispose();
    await tick();
    expect(document.head.querySelector('meta[name="reactive-desc"]')).toBe(null);
  });

  it("replaces an identity set wholesale and restores it on dispose (og:image)", async () => {
    let disposeBase, disposePage;
    createRoot(d => {
      disposeBase = d;
      r.useHead([
        { tag: "meta", props: { property: "og:image", content: "/a.png" } },
        { tag: "meta", props: { property: "og:image", content: "/b.png" } }
      ]);
      createRoot(d2 => {
        disposePage = d2;
        r.useHead({ tag: "meta", props: { property: "og:image", content: "/c.png" } });
      });
    });
    await tick();
    let imgs = [...document.head.querySelectorAll('meta[property="og:image"]')];
    expect(imgs.map(m => m.getAttribute("content"))).toEqual(["/c.png"]);

    disposePage();
    await tick();
    imgs = [...document.head.querySelectorAll('meta[property="og:image"]')];
    expect(imgs.map(m => m.getAttribute("content"))).toEqual(["/a.png", "/b.png"]);

    disposeBase();
    await tick();
    expect(document.head.querySelectorAll('meta[property="og:image"]').length).toBe(0);
  });

  it("mounts resource hints immediately, dedupes them, and never retracts them", async () => {
    let dispose;
    createRoot(d => {
      dispose = d;
      r.useHead({ tag: "link", props: { rel: "preload", href: "/hero.jpg", as: "image" } });
      r.useHead({ tag: "link", props: { rel: "preload", href: "/hero.jpg", as: "image" } });
    });
    // Resources apply synchronously at registration — no microtask needed.
    const links = document.head.querySelectorAll('link[rel="preload"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("as")).toBe("image");

    dispose();
    await tick();
    // Hints stay: retracting a preload is pointless churn.
    expect(document.head.querySelectorAll('link[rel="preload"]').length).toBe(1);
    links[0].remove();
  });

  it("follows the owner for stylesheet resources (ref-counted removal)", async () => {
    jest.useFakeTimers();
    let dispose;
    createRoot(d => {
      dispose = d;
      r.useHead({ tag: "link", props: { rel: "stylesheet", href: "/page.css" } });
    });
    const link = document.head.querySelector('link[rel="stylesheet"]');
    expect(link.getAttribute("href")).toBe("/page.css");

    dispose();
    await tick();
    jest.runAllTimers();
    expect(link.isConnected).toBe(false);
    jest.useRealTimers();
  });

  it("ignores base/charset on the client (shell-only identities)", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    let dispose;
    createRoot(d => {
      dispose = d;
      r.useHead({ tag: "base", props: { href: "/nope/" } });
    });
    await tick();
    expect(document.head.querySelector("base")).toBe(null);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("shell-only"));
    warn.mockRestore();
    dispose();
    await tick();
  });

  it("warns on and skips non-head tags", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    let dispose;
    createRoot(d => {
      dispose = d;
      r.useHead({ tag: "div", props: { id: "nope" } });
    });
    await tick();
    expect(document.head.querySelector("div")).toBe(null);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    dispose();
    await tick();
  });

  it("leaves foreign head content alone", async () => {
    const foreign = document.createElement("meta");
    foreign.setAttribute("name", "third-party");
    foreign.setAttribute("content", "keep");
    document.head.appendChild(foreign);

    let dispose;
    createRoot(d => {
      dispose = d;
      r.useHead({ tag: "meta", props: { name: "mine", content: "x" } });
    });
    await tick();
    dispose();
    await tick();
    expect(foreign.isConnected).toBe(true);
    foreign.remove();
  });
});
