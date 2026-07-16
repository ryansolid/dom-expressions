/**
 * FrameSink — the frame-chunk side of the renderToStream emission seam.
 *
 * `renderToStream` (server.js) routes all emission through semantic sink
 * methods — data / fragment / reveal / asset / shell — with the document sink
 * (inline <script>/<template>/<link> output) as the default. This module is
 * the other side of that seam: a sink emitting the transport-agnostic
 * FrameChunk stream, plus `renderToFrameStream`, the producer entry that
 * wires it up with a frame envelope (start/complete chunks) in place of the
 * document writable. Same render core, different assembly.
 *
 * What stays in the shared render core, unchanged:
 *   - the render context API and resolveSSRNode
 *   - root-hole resolution, blockingPromises, flush scheduling
 *   - the registerFragment registry, reveal groups, waitForFragments,
 *     propagateBoundaryStyles
 *   - asset tracking (createAssetTracking)
 *
 * Call-site map (server.js core -> sink method -> frame chunks):
 *
 *   serializer onData                 -> data(payload)             -> data
 *   doShell                           -> shell(html, meta)         -> [assets,] html
 *   registerFragment resolve (post-flush)
 *                                     -> fragment(key, html, meta) -> [assets,] fragment [, reveal when eager]
 *   revealFragments / revealFallbacks -> reveal(keys, meta)        -> reveal
 *   registerAsset (post-flush)        -> asset(type, url)          -> assets
 *   envelope completion               -> end()                     -> complete
 *   error paths (not yet routed)      -> error(id, err)            -> error
 *
 * Deliberately does NOT flush `<script>` tags, wrap data in the document
 * `$HY` bootstrap, or do string injection: control flow is passive records,
 * not active scripts (the reason the frame consumer must not reuse the $df*
 * helpers).
 */
import { sharedConfig } from "rxcore";
import { renderToStream } from "./server.js";
import { createJSONSerializer } from "./serializer.js";
import { createChunk } from "./server-functions/shared.js";
import { isResponseEnvelope } from "./response.js";
import { FRAME_STREAM_HEADER } from "./frame-transport.js";

/**
 * A sink emitting the transport-agnostic FrameChunk stream. `emit(chunk)` is
 * the envelope boundary (array push in tests, an encoded write over a real
 * transport). `id`/`version` address the frame.
 *
 * @param {(chunk: object) => void} emit
 * @param {{ id: string, version: number }} frame
 */
export function createFrameSink(emit, frame) {
  const { id, version } = frame;
  // Fragments that streamed styles ahead of a grouped reveal; the group's
  // reveal chunk must tell the consumer to wait on them.
  const styledKeys = new Set();
  return {
    shell(html, meta = {}) {
      // Pre-flush assets (entry modules, hoisted boundary styles) are head
      // splices in the document sink; a frame carries them as an assets chunk
      // ahead of the shell html. `meta.assets` (evaluated useAssets HTML) is
      // document-head material with no frame representation — frames are
      // boundary content, not documents — so it is dropped.
      if (meta.preloads && meta.preloads.size) {
        const styles = [];
        const modules = [];
        for (const url of meta.preloads) {
          (url.endsWith(".css") ? styles : modules).push(url);
        }
        const chunk = { type: "assets", id, version, key: "" };
        if (styles.length) chunk.styles = styles;
        if (modules.length) chunk.modules = modules;
        emit(chunk);
      }
      emit({ type: "html", id, version, html });
    },
    data(record) {
      // Keyed codec record ({ key, node, initial }) from createJSONSerializer
      // — the frame wire format: eval-free SerovalNode data the consumer
      // applies to its record table (createJSONDataTable). A plain string
      // (hydration script from createHydrationSerializer) still passes
      // through as a `payload` chunk for eval-style consumers.
      if (typeof record === "string") {
        emit({ type: "data", id, version, payload: record });
      } else {
        emit({
          type: "data",
          id,
          version,
          key: record.key,
          node: record.node,
          initial: record.initial
        });
      }
    },
    fragment(key, value, meta = {}) {
      // meta.styles is the core's { links, inline } split: stylesheet URLs
      // gate the reveal (they load async); inline styles are CSS content that
      // applies on insertion, carried by value, no gating.
      const links = (meta.styles && meta.styles.links) || [];
      const inline = (meta.styles && meta.styles.inline) || [];
      if (links.length || inline.length) {
        if (links.length) styledKeys.add(key);
        const chunk = { type: "assets", id, version, key };
        if (links.length) chunk.styles = links;
        if (inline.length) {
          chunk.inlineStyles = inline.map(e => ({ id: e.id, content: e.content, attrs: e.attrs }));
        }
        emit(chunk);
      }
      emit({ type: "fragment", id, version, key, html: value });
      // An eagerly-revealed fragment (no reveal group) carries its own
      // reveal; grouped fragments wait for an explicit reveal() call.
      if (!meta.revealGroup) {
        emit({ type: "reveal", id, version, keys: [key], waitForStyles: !!links.length });
      }
    },
    reveal(keys, meta = {}) {
      let waitForStyles = false;
      for (const key of keys) if (styledKeys.has(key)) waitForStyles = true;
      const chunk = { type: "reveal", id, version, keys, waitForStyles };
      if (meta.fallback) chunk.fallback = true;
      emit(chunk);
    },
    asset(type, url) {
      // Post-flush styles ride their fragment's assets chunk (fragment() gets
      // them via meta.styles) — same as the document sink, which only writes
      // style links on the fragment path. Emitting them here too would
      // duplicate, mis-keyed to the root.
      if (type !== "module") return;
      emit({ type: "assets", id, version, key: "", modules: [url] });
    },
    end() {
      emit({ type: "complete", id, version });
    },
    error(errorId, error) {
      emit({ type: "error", id, version, key: errorId, error });
    },
    // A named slot invocation from the projection props proxy: the client's
    // render callback for the occurrence's prop is called with these args.
    // No document-sink counterpart — projections only exist in frame streams.
    slot(key, args) {
      emit({ type: "slot", id, version, key, args });
    },
    // A nested server-content region (a `{$frame}` slot arg): its html is a
    // chunk addressed to the CHILD frame id — the consumer binds a nested
    // frame to the arg's marker range and the host routes/buffers by id.
    region(childId, html) {
      emit({ type: "html", id: childId, version, html });
    }
  };
}

/**
 * Render to a FrameChunk stream: the same render core as `renderToStream`,
 * with emission swapped to `createFrameSink` and the document writable
 * replaced by a chunk envelope. The envelope emits `start` up front and
 * `complete` at stream end; no document text is ever written.
 *
 *   renderToFrameStream(code, { frame: { id: "f0", version: 1 } })
 *     .pipe({ write(chunk) { ... }, end() { ... } });
 *
 *   const chunks = await renderToFrameStream(code, opts); // collected array
 *
 * Remaining `renderToStream` options (renderId, plugins, onError, manifest,
 * ...) pass through; `options.sink` is owned by this entry.
 *
 * @param {() => unknown} code
 * @param {{ frame?: { id?: string, version?: number } } & object} options
 */
export function renderToFrameStream(code, options = {}) {
  return frameStream(() => code, options);
}

/**
 * Render a **server component** — a `props => JSX` function, typically
 * returned from a server function — to a FrameChunk stream. `props` is a
 * projection proxy, not data: reading a prop as a child emits a projection
 * marker range the client fills with its own content; calling a prop as a
 * render function additionally emits a `slot` chunk carrying the call's
 * args (one occurrence per call, so iteration and state-follows-id reorder
 * work on the consumer). Args serialize through the frame's data codec —
 * primitives ride literally, everything else becomes a `{ $ref }` the
 * consumer resolves against its data table.
 *
 * This is the producing half of the convention "a function returned from a
 * server function is a server component"; the props the *client* passes
 * never reach the server — the server only marks where they go.
 *
 * @param {(props: object) => unknown} component
 * @param {{ frame?: { id?: string, version?: number } } & object} options
 */
export function renderServerComponent(component, options = {}) {
  return frameStream((sink, frame) => {
    const props = createProjectionProps(sink, frame);
    return () => component(props);
  }, options);
}

// The shared chunk envelope: `start` up front, the frame sink for all render
// emission, `complete` + end on the stream settling. `makeCode` builds the
// render thunk with access to the sink/frame (the projection proxy needs
// both); no document text is ever written.
function frameStream(makeCode, options) {
  const { id = "", version = 1 } = options.frame || {};
  const frame = { id, version };
  function stream(w) {
    const emit = chunk => w.write(chunk);
    const sink = createFrameSink(emit, frame);
    emit({ type: "start", id, version });
    try {
      // Frames default to the keyed JSON codec for data records (eval-free
      // nodes; decode with createJSONDataTable). `options.serializer` can
      // override — e.g. createHydrationSerializer for eval-style payloads.
      renderToStream(makeCode(sink, frame), {
        serializer: createJSONSerializer,
        ...options,
        sink
      }).pipe({
        // Every document emission is intercepted by the frame sink, so no
        // text arrives here; the writable exists only for the completion
        // signal.
        write() {},
        end() {
          sink.end();
          w.end && w.end();
        }
      });
    } catch (err) {
      // A synchronous render failure travels as a structured chunk — the
      // consumer stores an `:error` record instead of seeing a truncated
      // stream. (Async fragment errors already ride their rejected `_fr`
      // promise through the data codec.)
      sink.error("", err instanceof Error ? err.message : String(err));
      sink.end();
      w.end && w.end();
    }
  }
  return {
    pipe: stream,
    then(onFulfilled, onRejected) {
      return new Promise((resolve, reject) => {
        const chunks = [];
        try {
          stream({ write: chunk => chunks.push(chunk), end: () => resolve(chunks) });
        } catch (err) {
          reject(err);
        }
      }).then(onFulfilled, onRejected);
    }
  };
}

/** The projection marker range for an occurrence, as a pre-rendered SSR value. */
function projectionRange(occurrence) {
  return { t: `<!--proj:${occurrence}:start--><!--proj:${occurrence}:end-->` };
}

/**
 * The props proxy handed to a server component. Every prop resolves to a
 * function (SSR hole resolution invokes child-position functions with no
 * arguments, so one shape serves both uses):
 *
 *  - invoked with no args (child position — `{props.children}`): renders as
 *    the direct-insert marker range for the prop. Stable per prop; placing
 *    the same prop twice repeats the same occurrence id and the consumer
 *    mounts the first range found.
 *  - invoked with an args object (render prop — `props.item({...})`): emits
 *    a `slot` chunk for a fresh `prop#N` occurrence and renders as that
 *    occurrence's marker range. Primitive args pass literally; other values
 *    serialize under `arg:<occurrence>:<key>` ids (referential dedupe across
 *    occurrences comes from the codec's shared refs — the no-double-data
 *    invariant at the args level).
 *
 * Serialization goes through the live render context, so the proxy must
 * only be *used* during the frame's render.
 */
/** Whether a slot-arg value is server JSX: an SSR template object, or an
 *  array made entirely of them (compiled children lists). */
function isServerContent(value) {
  if (value && typeof value === "object") {
    if ("t" in value) return true;
    if (Array.isArray(value) && value.length > 0) {
      for (const item of value) {
        if (!(item && typeof item === "object" && "t" in item)) return false;
      }
      return true;
    }
  }
  return false;
}

export function createProjectionProps(sink, frame) {
  const counts = Object.create(null);
  const getters = new Map();
  let regionCount = 0;
  return new Proxy(Object.create(null), {
    // Every key virtually exists — a prop is a *position* the client may
    // fill, and the server cannot know which ones the client supplied. This
    // is what routes reactive-core merge utilities down their proxy path
    // ($PROXY in source) and resolves per-property lookups (property in s)
    // to us; it also means merged defaults never override a projection —
    // correct, since projection fallbacks belong to the client slot.
    // Enumeration stays empty by nature (positions aren't listable), so
    // spreads copy nothing: server components should read props directly.
    has() {
      return true;
    },
    get(_, prop) {
      if (typeof prop !== "string") return undefined;
      // `has: true` + callable gets would otherwise make the proxy thenable
      // — a stray await/Promise.resolve would "call" a phantom then slot.
      if (prop === "then") return undefined;
      let fn = getters.get(prop);
      if (!fn) {
        fn = (...callArgs) => {
          if (callArgs.length === 0 || callArgs[0] === undefined) {
            return projectionRange(prop);
          }
          const raw = callArgs[0];
          // Keyed identity (RFC open question 1): a primitive `key` arg names
          // the occurrence, so client state follows the entity across
          // responses — same key + equivalent args on a later stream is the
          // same occurrence and the consumer's dedupe skips the re-call.
          // Without a key, identity is positional per prop.
          let occurrence;
          const k = raw.key;
          if (typeof k === "string" || typeof k === "number") {
            occurrence = `${prop}#${k}`;
          } else {
            const n = counts[prop] || 0;
            counts[prop] = n + 1;
            occurrence = `${prop}#${n}`;
          }
          const args = {};
          for (const key of Object.keys(raw)) {
            const value = raw[key];
            const t = typeof value;
            if (value == null || t === "string" || t === "number" || t === "boolean") {
              args[key] = value;
            } else if (isServerContent(value)) {
              // Server JSX flows as a nested region, never as data — the
              // no-double-serialize invariant (transport dispatch case 1):
              // its html is the transfer; the client wraps the range without
              // re-rendering it. Nested occurrence markers evaluated inside
              // this content already emitted their slot chunks against this
              // frame — the consumer threads record lookup up the frame tree.
              const resolved = sharedConfig.context.resolve(value);
              if (resolved.h.length) {
                throw new Error(
                  "Async server content in slot args is not supported yet (arg '" +
                    key +
                    "' of " +
                    occurrence +
                    "). Move the async read above the projection or into a fragment."
                );
              }
              const childId = `${frame.id}.${regionCount++}`;
              sink.region(childId, resolved.t[0]);
              args[key] = { $frame: childId };
            } else {
              const ref = `arg:${occurrence}:${key}`;
              sharedConfig.context.serialize(ref, value);
              args[key] = { $ref: ref };
            }
          }
          sink.slot(occurrence, args);
          return projectionRange(occurrence);
        };
        getters.set(prop, fn);
      }
      return fn;
    }
  });
}

/**
 * A server component as an HTTP Response: `renderServerComponent`'s chunk
 * stream, framed with the server-function wire convention (length-prefixed
 * JSON — see frame-transport.js for the reader). Tagged with
 * `X-Frame-Stream: <frame id>` for the client and `X-Content-Raw` so the
 * server-function handler forwards it untouched instead of codec-encoding
 * it. `init` (headers/status, e.g. from a `respond()` envelope) merges in;
 * the frame tags win on conflict.
 */
export function serverComponentResponse(component, options = {}, init = {}) {
  const { id = "", version = 1 } = options.frame || {};
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/x-frame-stream");
  headers.set(FRAME_STREAM_HEADER, id);
  headers.set("X-Content-Raw", "1");
  const stream = renderServerComponent(component, { ...options, frame: { id, version } });
  const body = new ReadableStream({
    start(controller) {
      stream.pipe({
        write(chunk) {
          controller.enqueue(createChunk(JSON.stringify(chunk)));
        },
        end() {
          controller.close();
        }
      });
    }
  });
  return new Response(body, { status: init.status || 200, headers });
}

/**
 * The server-component convention as a `transformResult` policy for
 * `handleServerFunctionRequest`: **a function returned from a server
 * function is a server component** — it renders as a frame-stream Response
 * (frame id defaulting to the server function's id, so repeat calls target
 * the same client boundary and policy A morphs in place). A `respond()`
 * envelope whose value is a function contributes its headers/status to the
 * frame Response. Everything else passes through untouched.
 */
export function frameTransformResult(event, result) {
  let init;
  if (isResponseEnvelope(result)) {
    const { response, value } = result;
    if (typeof value !== "function") return result;
    init = response ? { headers: response.headers, status: response.status } : undefined;
    result = value;
  }
  if (typeof result !== "function") return result;
  const meta = event && event.locals && event.locals.serverFunctionMeta;
  return serverComponentResponse(result, { frame: { id: (meta && meta.id) || "" } }, init);
}
