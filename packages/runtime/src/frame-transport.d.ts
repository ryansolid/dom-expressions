import { FrameChunk, FrameHost } from "./frame-client.js";

/**
 * Header tagging a Response as a frame stream; its value is the producing
 * frame's id. Frame-owned wire contract — deliberately not a server-function
 * `BodyFormat` entry, since the body is frame chunks, not a serialized value.
 */
export const FRAME_STREAM_HEADER: "X-Frame-Stream";

/** Whether a fetch Response carries a frame stream. */
export function isFrameStreamResponse(response: Response): boolean;

/** Options for `applyFrameResponse`. */
export interface ApplyFrameResponseOptions {
  /**
   * Remap the producer's root frame id onto a local one — the id your
   * insertable/frame registered under — so navigations to the same boundary
   * reuse the same frame regardless of what the server called it. Boundary
   * identity belongs to the client.
   */
  as?: string;
}

/**
 * Reads a frame-stream Response to completion, applying every chunk to
 * `host`. Chunks are length-prefixed JSON over the server-function wire
 * framing. Resolves with the id the chunks were applied under once the
 * stream ends; rejects on a malformed or errored stream.
 *
 * @example
 * ```ts
 * const response = await getStory(id); // frame-tagged server function result
 * if (isFrameStreamResponse(response)) {
 *   await applyFrameResponse(response, host, { as: "story-pane" });
 * }
 * ```
 */
export function applyFrameResponse(
  response: Response,
  host: FrameHost,
  options?: ApplyFrameResponseOptions
): Promise<string>;
