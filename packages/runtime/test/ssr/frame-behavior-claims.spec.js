/**
 * @jest-environment jsdom
 *
 * Behavior claims (Stage 6, server half). Compiled SSR output under the
 * `serverComponents` compiler option emits, per intrinsic element carrying
 * ref/on* positions, one guarded whole-attribute hole:
 *
 *   sharedConfig.context && sharedConfig.context.claims
 *     ? ssrClaim({ click: props.onCopy, ref: props.btn }) : ""
 *
 * The brand is the slot-props stub: a function-valued prop READ off a
 * server component's props proxy carries its prop name, and the marker
 * names it — `_bnd="click=onCopy"`. These tests hand-write the compiled
 * form (the tagged-template dialect the frame specs share) and assert the
 * mint on both faces, the fill-window gate, and the marker grammar.
 */
import * as r from "../../src/server";
import {
  renderServerComponent,
  frameTransformDirectResult,
  ServerComponentPlugin
} from "../../src/frame-sink";

// The compiled guard, verbatim (what the babel transform emits).
const claim = map =>
  r.sharedConfig.context && r.sharedConfig.context.claims ? r.ssrClaim(map) : "";

function collectStream(component, frame = { id: "f", version: 1 }) {
  return new Promise(resolve => {
    const chunks = [];
    renderServerComponent(component, { frame }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks)
    });
  });
}

function collectDocument(component, clientProps, id = "f") {
  return new Promise(resolve => {
    const Inline = frameTransformDirectResult(component, { id });
    const chunks = [];
    r.renderToStream(() => Inline(clientProps), { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks.join(""))
    });
  });
}

const htmlOf = chunks =>
  chunks
    .filter(c => c.type === "html")
    .map(c => c.html)
    .join("");

describe("behavior claims — stream face", () => {
  it("a stub in an event position mints _bnd naming its prop", async () => {
    const chunks = await collectStream(
      props => r.ssr`<button${claim({ click: props.onCopy })}>Copy</button>`
    );
    expect(htmlOf(chunks)).toContain(`<button _bnd="click=onCopy">Copy</button>`);
  });

  it("multiple positions on one element share one marker", async () => {
    const chunks = await collectStream(
      props => r.ssr`<button${claim({ click: props.onCopy, ref: props.btn })}>x</button>`
    );
    expect(htmlOf(chunks)).toContain(`_bnd="click=onCopy,ref=btn"`);
  });

  it("multiple refs (array value) mint repeated entries", async () => {
    const chunks = await collectStream(
      props => r.ssr`<a${claim({ ref: [props.one, props.two] })}>x</a>`
    );
    expect(htmlOf(chunks)).toContain(`_bnd="ref=one,ref=two"`);
  });

  it("prop names percent-encode onto the marker alphabet", async () => {
    const chunks = await collectStream(
      props => r.ssr`<b${claim({ click: props['weird "name"=,'] })}>x</b>`
    );
    const html = htmlOf(chunks);
    const m = html.match(/_bnd="click=([^"]*)"/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toMatch(/[^A-Za-z0-9_.%-]/);
    expect(decodeURIComponent(m[1])).toBe('weird "name"=,');
  });

  it("a server-local function contributes nothing and warns", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const local = () => {};
      const chunks = await collectStream(
        props => r.ssr`<span${claim({ click: local })}>x</span>`
      );
      expect(htmlOf(chunks)).toContain("<span>x</span>");
      expect(htmlOf(chunks)).not.toContain("_bnd");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/can never run/);
    } finally {
      warn.mockRestore();
    }
  });

  it("a local function mixed with a stub drops only the local one", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const local = () => {};
      const chunks = await collectStream(
        props => r.ssr`<i${claim({ click: local, ref: props.el })}>x</i>`
      );
      expect(htmlOf(chunks)).toContain(`_bnd="ref=el"`);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("behavior claims — document face", () => {
  it("a server component's own elements mint _bnd at t=0", async () => {
    const html = await collectDocument(
      props => r.ssr`<button${claim({ click: props.onCopy })}>Copy</button>`,
      {}
    );
    expect(html).toContain(`_bnd="click=onCopy"`);
  });

  it("client fill content never claims and never warns (scope gate)", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const localHandler = () => {};
      // The client's render prop: its fill renders inline on the document
      // face, inside the suppressed/client-owned window. A local handler
      // there is legitimate (hydration owns it) — no marker, no warning.
      const html = await collectDocument(
        props => r.ssr`<div>${[props.row({ n: 1 })]}</div>`,
        { row: () => r.ssr`<em${claim({ click: localHandler })}>fill</em>` }
      );
      expect(html).toContain("<em>fill</em>");
      expect(html).not.toContain("_bnd");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("document content outside the server component never claims", async () => {
    const localHandler = () => {};
    const chunks = [];
    const Inline = frameTransformDirectResult(
      props => r.ssr`<button${claim({ click: props.onCopy })}>in</button>`,
      { id: "f" }
    );
    const html = await new Promise(resolve => {
      r.renderToStream(
        () => [
          r.ssr`<nav${claim({ click: localHandler })}>out</nav>`,
          Inline({})
        ],
        { plugins: [ServerComponentPlugin] }
      ).pipe({
        write: c => chunks.push(c),
        end: () => resolve(chunks.join(""))
      });
    });
    expect(html).toContain("<nav>out</nav>");
    expect(html).toContain(`<button _bnd="click=onCopy">in</button>`);
  });
});

describe("behavior claims — gate mechanics", () => {
  it("mint suppression (sweeps/retries) does not close the gate on the stream face", async () => {
    let probe;
    await collectStream(props => {
      const live = r.sharedConfig.context.liveHoles;
      // A hole re-emission resolves under `suppressed`/`sweeping`; claims
      // must keep minting through it or morphs would strip behavior.
      live.suppressed++;
      live.sweeping = true;
      const marker = r.ssrClaim({ click: props.onCopy });
      live.suppressed--;
      live.sweeping = false;
      probe = marker;
      return r.ssr`<div>x</div>`;
    });
    expect(probe).toBe(` _bnd="click=onCopy"`);
  });

  it("plain SSR without server components leaves ctx.claims unset (never evaluates)", async () => {
    let seen = "unset";
    await new Promise(resolve => {
      r.renderToStream(() => {
        seen = r.sharedConfig.context && r.sharedConfig.context.claims;
        return r.ssr`<div>plain</div>`;
      }).pipe({ write: () => {}, end: resolve });
    });
    expect(seen).toBeUndefined();
  });
});
