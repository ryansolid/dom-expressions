import { FrameChunk } from "./frame-client.js";

/** Addresses a frame stream: the boundary id and this response's version. */
export interface FrameAddress {
  id: string;
  version: number;
}

/**
 * The emission surface `renderToStream` routes through when producing a
 * frame stream instead of a document (see the `sink` render option). Each
 * method emits transport-agnostic chunks; `emit` is the envelope boundary.
 * @internal Compiler/renderer wiring — use `renderToFrameStream` or
 * `renderServerComponent` instead.
 */
export function createFrameSink(
  emit: (chunk: FrameChunk) => void,
  frame: FrameAddress
): Record<string, (...args: any[]) => void>;

/** Options shared by the frame producers. */
export interface FrameStreamOptions {
  /** Boundary address; defaults to `{ id: "", version: 1 }`. */
  frame?: { id?: string; version?: number };
  /** Remaining `renderToStream` options (plugins, onError, manifest, ...). */
  [key: string]: unknown;
}

/** A produced frame stream: pipe chunks, or await the collected array. */
export interface FrameStream extends PromiseLike<FrameChunk[]> {
  pipe(writable: { write(chunk: FrameChunk): void; end?(): void }): void;
}

/**
 * Render to a FrameChunk stream: the same render core as `renderToStream`
 * with emission swapped to the frame sink and the document writable replaced
 * by a chunk envelope (`start` up front, `complete` at stream end). Data
 * records default to the keyed JSON codec (decode with
 * `createJSONDataTable`).
 */
export function renderToFrameStream(code: () => unknown, options?: FrameStreamOptions): FrameStream;

/**
 * Render a **server component** — a `props => JSX` function, typically
 * returned from a server function — to a FrameChunk stream. `props` is a
 * projection proxy, not data:
 *
 * - reading a prop as a child emits a marker range the client fills;
 * - calling a prop as a render function emits a `slot` chunk for a fresh
 *   occurrence (a primitive `$key` arg names it, so client state follows the
 *   entity across responses — the projection-level analogue of For's `keyed`
 *   function; positional otherwise, which is the right default for most
 *   flows);
 * - primitive args ride the chunk; server JSX args stream as nested regions
 *   (`{$frame}` — html once, never data); other values serialize as `{$ref}`
 *   data records with referential dedupe.
 *
 * The props a *client* passes never reach the server — server inputs are the
 * function's arguments.
 */
export function renderServerComponent(
  component: (props: Record<string, any>) => unknown,
  options?: FrameStreamOptions
): FrameStream;

/**
 * The projection props proxy used by `renderServerComponent`. Every key
 * virtually exists (`in` is always true — a prop is a position the client
 * may fill), enumeration is empty by design, and serialization goes through
 * the live render context, so it must only be used during the frame's
 * render.
 * @internal Exposed for framework bindings composing their own producers.
 */
export function createProjectionProps(
  sink: ReturnType<typeof createFrameSink>,
  frame: FrameAddress
): Record<string, any>;

/**
 * A server component as an HTTP Response: the chunk stream framed with the
 * server-function wire convention, tagged `X-Frame-Stream: <frame id>` for
 * the client and `X-Content-Raw` so the server-function handler forwards it
 * untouched. `init` (headers/status, e.g. from a `respond()` envelope)
 * merges in; the frame tags win on conflict.
 */
export function serverComponentResponse(
  component: (props: Record<string, any>) => unknown,
  options?: FrameStreamOptions,
  init?: { headers?: HeadersInit; status?: number }
): Response;

/**
 * The server-component convention as a `transformResult` policy for
 * `handleServerFunctionRequest`: a function result — or a `respond()`
 * envelope whose value is a function — becomes a frame-stream Response,
 * with the frame id defaulting to the server function's id so repeat calls
 * target the same client boundary. Everything else passes through.
 *
 * @example
 * ```ts
 * handleServerFunctionRequest(request, {
 *   transformResult: frameTransformResult,
 *   provideEvent
 * });
 * ```
 */
export function frameTransformResult(event: unknown, result: unknown): unknown;
