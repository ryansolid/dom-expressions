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
import { renderToStream } from "./server.js";
import { createJSONSerializer } from "./serializer.js";

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
  const { id = "", version = 1 } = options.frame || {};
  const frame = { id, version };
  function stream(w) {
    const emit = chunk => w.write(chunk);
    const sink = createFrameSink(emit, frame);
    emit({ type: "start", id, version });
    // Frames default to the keyed JSON codec for data records (eval-free
    // nodes; decode with createJSONDataTable). `options.serializer` can
    // override — e.g. createHydrationSerializer for eval-style payloads.
    renderToStream(code, { serializer: createJSONSerializer, ...options, sink }).pipe({
      // Every document emission is intercepted by the frame sink, so no text
      // arrives here; the writable exists only for the completion signal.
      write() {},
      end() {
        sink.end();
        w.end && w.end();
      }
    });
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
