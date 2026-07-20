/**
 * Client frame runtime — the consumer side of a frame stream. A frame
 * renders server-owned content into a DOM boundary from a resident keyed
 * record store: chunks are writes, not events, so application is
 * prerequisite-driven and order-independent. Client-owned projections
 * (slots) inside the boundary are preserved across server updates — the
 * version is a stale-guard only ("policy A"): newer content morphs in
 * place, and teardown is `dispose()`, never a version bump.
 */

/** One transport chunk of a frame stream, addressed by frame `id`. */
export type FrameChunk =
  | { type: "start"; id: string; version: number }
  | { type: "html"; id: string; version: number; html: string }
  | { type: "fragment"; id: string; version: number; key: string; html: string }
  | {
      type: "reveal";
      id: string;
      version: number;
      keys: string[];
      waitForStyles?: boolean;
      fallback?: boolean;
    }
  | {
      type: "data";
      id: string;
      version: number;
      key?: string;
      node?: unknown;
      initial?: boolean;
      /** Eval-style hydration script — only when produced with the hydration serializer. */
      payload?: string;
    }
  | {
      type: "assets";
      id: string;
      version: number;
      key: string;
      modules?: string[];
      styles?: string[];
      inlineStyles?: { id: string; content?: string; attrs?: Record<string, string> }[];
    }
  | { type: "slot"; id: string; version: number; key: string; args: Record<string, unknown> }
  | { type: "template"; id: string; version: number; key: string; html: string; fields: string[] }
  | {
      type: "block";
      id: string;
      version: number;
      key: string;
      template: string;
      values: unknown[];
    }
  | { type: "complete"; id: string; version: number }
  | { type: "error"; id: string; version: number; key?: string; error: unknown };

/**
 * Maps a wire chunk onto resident-store record writes. `data` chunks map to
 * no records — they are response-scoped and the host applies them through
 * its data hook.
 */
export function chunkToRecords(chunk: FrameChunk): Record<string, unknown>;

/** A batch of record writes for a frame version, merged into its store. */
export interface FrameWrite {
  version: number;
  r: Record<string, unknown>;
}

/** Context passed to a slot callback. */
export interface SlotContext {
  /**
   * Register cleanup for when this occurrence's range is removed from the
   * server content, or the owning frame is disposed.
   */
  onCleanup(fn: () => void): void;
  /**
   * The range's current interior — server-rendered client content on an
   * adopted document-SSR boot, or the previous output on a re-call. A
   * framework binding hydrates onto it and returns `undefined` to claim it
   * in place (zero DOM mutation).
   */
  existing: ChildNode[];
}

/**
 * Client content for a server-declared projection. Direct-insert occurrences
 * call it with empty props; render-prop occurrences pass the occurrence's
 * resolved args (primitives literal, `{$ref}` data resolved through the
 * host, `{$frame}` regions as marker-range fragments). Return nodes to fill
 * the range, or `undefined` to claim `ctx.existing` untouched.
 */
export type Slot = (props: Record<string, unknown>, ctx: SlotContext) => Node | Node[] | undefined;

export interface Frame {
  /** Merge a write into the store and flush (morph/reveal/slot sync). */
  apply(write: FrameWrite): void;
  /** The active version, or undefined before the first apply. */
  readonly version: number | undefined;
  /** Read-only view of the resident record store. */
  readonly store: Readonly<Record<string, unknown>>;
  /** The stream's error record, if an `error` chunk arrived. */
  readonly error: unknown;
  /** Whether the named fragment has been revealed into the boundary. */
  isRevealed(segment: string): boolean;
  /** Tear down: slot cleanups cascade, later chunks are ignored. Idempotent. */
  dispose(): void;
}

/**
 * Routes a flat stream of addressed chunks to frames by id, buffering chunks
 * for frames that have not registered yet (only the newest version's chunks
 * are kept). `data` chunks are response-scoped and go to `applyData`.
 *
 * An id may have several frames (the same server component mounted more
 * than once): chunks fan out to all of them, and a frame registering after
 * delivery is seeded from a sibling's store.
 */
export interface FrameHost {
  register(id: string, frame: Frame): void;
  /** Remove one frame (or all frames of the id when `frame` is omitted). */
  unregister(id: string, frame?: Frame): void;
  apply(chunk: FrameChunk): void;
  /** The first registered frame under the id, if any. */
  get(id: string): Frame | undefined;
  serialize(value: unknown): { $ref: string };
  /** `frameId` is the resolving frame's id — route to its stream's table. */
  resolve(ref: { $ref: string }, frameId?: string): unknown;
}

/**
 * The bubbling DOM event (`"frame:applied"`) a frame dispatches from its
 * parent element whenever server content lands in the document — root
 * materialize/morph, segment reveal, fallback materialization — with
 * `detail: { id, version, reason }`. One document-level listener sees every
 * boundary (nested region frames dispatch too); use it to re-apply
 * client-owned decorations on server-owned markup (router affordance
 * reflection, e.g. `aria-current`) without a MutationObserver.
 */
export const FRAME_APPLIED_EVENT: "frame:applied";

/** Options for `createFrameHost`. */
export interface FrameHostOptions {
  /**
   * Backs `{$ref}` slot args (typically a codec data table's `resolve`).
   * `frameId` identifies the resolving frame — data tables are
   * response-scoped, so multi-stream hosts route by it (nested region ids
   * prefix-match their root).
   */
  resolve?(ref: { $ref: string }, frameId?: string): unknown;
  /** Test/host-side counterpart of `resolve`. */
  serialize?(value: unknown): { $ref: string };
  /**
   * Receives each `data` chunk whole. Wire a codec table:
   * `applyData: c => table.apply(c)` (see `createJSONDataTable`).
   */
  applyData?(chunk: Extract<FrameChunk, { type: "data" }>): void;
}

export function createFrameHost(options?: FrameHostOptions): FrameHost;

/** Options for `createFrame` / `createFrameInsertable`. */
export interface FrameOptions {
  /** Register with this host under `id`, receiving routed/buffered chunks. */
  host?: FrameHost;
  id?: string;
  /** Client content keyed by prop name (occurrences resolve by prop). */
  slots?: Record<string, Slot>;
  /**
   * Adopt existing server-rendered DOM: the first apply morphs against it,
   * and slots sync immediately (hydration attach) — a document-SSR boot
   * needs no chunk.
   */
  adopt?: boolean;
  /** Called after each apply flush (tests/telemetry). */
  onApply?(info: { version: number; reason: "materialize" | "morph" | "reveal" }): void;
}

/** A frame rendering into an element boundary. */
export function createFrame(boundary: Element, options?: FrameOptions): Frame;

/**
 * A branded frame-insertable value: the client runtime's `insert` recognizes
 * it (registered `$$FRAME` symbol) and calls the mount handler the value
 * carries — a comment range is established at the insertion point and a
 * host-registered frame binds to it. One static mount per value; lifecycle
 * belongs to the creator via `dispose()` (register it with your owner's
 * cleanup).
 */
export function createFrameInsertable(options: FrameOptions): {
  readonly frame: Frame | null;
  dispose(): void;
};
