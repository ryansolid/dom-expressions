/**
 * FrameSink — DESIGN SKETCH (not wired in yet).
 *
 * `renderToString` and `renderToStream` share one render `context` API
 * (`serialize`/`resolve`/`ssr`/`registerFragment`/`registerAsset`/reveal) and
 * differ ONLY in how the results become output. Today that "how" is inlined
 * into the stream closure as document-specific emission (script tags, <template>
 * fragments, <link> styles, asset injection). A `FrameSink` factors that "how"
 * out behind semantic methods so the same renderer can drive either:
 *
 *   - a document sink  -> the current <script>/<template>/<link> behavior
 *   - a frame sink     -> the transport-agnostic FrameChunk stream (the spike)
 *
 * The methods are SEMANTIC, not raw writes, so the frame sink can emit
 * structured chunks while the document sink keeps its batching/injection.
 *
 * What stays in the (shared) renderer core, unchanged:
 *   - the render context API and resolveSSRNode
 *   - root-hole resolution (resolveRootHoles), blockingPromises, flush scheduling
 *   - the registerFragment registry, reveal groups, waitForFragments,
 *     propagateBoundaryStyles
 *   - asset tracking (createAssetTracking)
 *
 * Call-site map (current server.js -> sink method -> frame chunk):
 *
 *   serializer onData (pushTask / renderToString onData)    -> data(payload)       -> { type:"data" }
 *   doShell buffer.write(injected html)                     -> shell(html, meta)   -> { type:"html" } (+assets)
 *   registerFragment resolve: <template>+<link>+$dfs/$df    -> fragment(key,v,meta)-> { type:"fragment" } (+assets,+reveal)
 *   revealFragments / revealFallbacks ($dfj / $dflj)        -> reveal(keys, meta)  -> { type:"reveal" }
 *   registerAsset late <link modulepreload> / injectPreload -> asset(type, url)    -> { type:"assets" }
 *   writable.end()                                          -> end()               -> { type:"complete" }
 *   error paths                                             -> error(id, err)      -> { type:"error" }
 *
 * @typedef {Object} FrameSink
 * @property {(html: string, meta: { assets?: unknown, tasks?: string }) => void} shell
 *   The initial shell. Document sink: injectAssets + injectPreloadLinks +
 *   injectScripts, then buffer.write. Frame sink: emit an `html` chunk plus any
 *   asset/data chunks.
 * @property {(payload: string) => void} data
 *   One serialized data record (Seroval JS string for a single id). Document
 *   sink: accumulate into tasks, flush as <script>. Frame sink: `data` chunk.
 * @property {(key: string, value: string, meta: { styles?: string[], revealGroup?: string, deferActivation?: boolean }) => void} fragment
 *   An async fragment resolved with its HTML payload. Document sink: write
 *   <template id=key>value</template> (+ style <link onload=$dfc> + $dfs/$df
 *   tasks). Frame sink: `fragment` chunk (+ `assets`, + `reveal` when eager).
 * @property {(keys: string[], meta: { fallback?: boolean, waitForStyles?: boolean }) => void} reveal
 *   Reveal a group of fragments. Document sink: $dfj / $dflj task. Frame sink:
 *   `reveal` chunk.
 * @property {(type: "module" | "style", url: string) => void} asset
 *   An asset for the current boundary. Document sink: <link modulepreload> /
 *   injected stylesheet. Frame sink: `assets` chunk keyed by boundary.
 * @property {() => void} end
 *   Stream completion. Document sink: writable.end(). Frame sink: `complete`.
 * @property {(id: string, error: unknown) => void} error
 *   An error for a boundary. Frame sink: `error` chunk; clears pending writes.
 */

/**
 * The frame sink: emit the transport-agnostic FrameChunk stream instead of a
 * document. `emit(chunk)` is the envelope boundary (array push in tests, an
 * encoded write over a real transport). `id`/`version` address the frame.
 *
 * Deliberately does NOT flush `<script>` tags, wrap data in the document `$HY`
 * bootstrap, or do string injection: control flow is passive records, not
 * active scripts (the reason the frame consumer must not reuse the $df* helpers).
 *
 * @param {(chunk: object) => void} emit
 * @param {{ id: string, version: number }} frame
 * @returns {FrameSink}
 */
export function createFrameSink(emit, frame) {
  const { id, version } = frame;
  return {
    shell(html /*, meta */) {
      // Server-owned shell HTML. Assets/data that the document sink would have
      // injected inline are emitted as their own chunks instead (see asset/data).
      emit({ type: "html", id, version, html });
    },
    data(payload) {
      // Seroval output for one id, delivered as a passive record rather than a
      // <script> that assigns into _$HY.r. The consumer applies it to its store.
      emit({ type: "data", id, version, payload });
    },
    fragment(key, value, meta = {}) {
      if (meta.assets) {
        emit({ type: "assets", id, version, key, ...meta.assets });
      }
      emit({ type: "fragment", id, version, key, html: value });
      // An eagerly-revealed fragment (no reveal group) carries its own reveal;
      // grouped fragments wait for an explicit reveal() call.
      if (!meta.revealGroup) {
        emit({
          type: "reveal",
          id,
          version,
          keys: [key],
          waitForStyles: !!(meta.styles && meta.styles.length)
        });
      }
    },
    reveal(keys, meta = {}) {
      emit({
        type: "reveal",
        id,
        version,
        keys,
        waitForStyles: !!meta.waitForStyles,
        fallback: !!meta.fallback
      });
    },
    asset(type, url) {
      emit({ type: "assets", id, version, [type === "style" ? "styles" : "modules"]: [url] });
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
 * Seam-extraction order (each gated by the existing 504-test baseline; the
 * document sink stays the default so document SSR output is unchanged):
 *
 *   1. data   — route serializer `onData` through `sink.data`. Lowest risk;
 *               validates the serialization-delegation seam against real Seroval.
 *   2. fragment/reveal/asset — lift the registerFragment resolve closure and the
 *               reveal/asset emission behind the sink, keeping registry + reveal
 *               groups + waitForFragments in the core.
 *   3. shell  — the highest-risk seam: doShell does document string surgery
 *               (injectAssets/injectPreloadLinks/injectScripts). For a frame the
 *               shell is an `html` chunk plus separate asset/data chunks, so this
 *               is a different assembly, not just a different write. Prove this
 *               one last, guarded by the parity test.
 */
