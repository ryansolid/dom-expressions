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
  /**
   * Restamp every chunk of the response with this version (one response IS
   * one version). Versions belong to the client too: the producer cannot
   * know how many streams a boundary has consumed, so pass the Nth-response
   * counter to make policy A's stale-guard real across navigations.
   */
  version?: number;
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

/** Options for `createServerComponentHandler`. */
export interface ServerComponentHandlerOptions<C = unknown> {
  host: FrameHost;
  /**
   * Builds the framework's mountable component for a boundary. Invoked once
   * per boundary and cached; every mount of the returned component is its
   * own frame instance under the boundary id (multi-mount fans out).
   */
  component(frameId: string): C;
  /**
   * Runs synchronously at each server-function call site (before any
   * await); its return is the call's ambient identity — e.g. Solid's
   * `getOwner`. Calls sharing a captured context share one boundary.
   */
  capture?(info: { id: string; meta: unknown }): unknown;
  /**
   * A new response is about to stream into a boundary: rotate
   * response-scoped state (codec data tables) here. `version` is the
   * client-owned stream counter the chunks will be stamped with.
   */
  onStream?(frameId: string, version: number, response: Response): void;
}

/**
 * The client mirror of `frameTransformResult`, shaped for the server-function
 * client's `responseHandler` seam: frame-stream responses resolve the call
 * with a **stable component** instead of data, so an equals-gated consumer
 * (Solid's `dynamic`) never remounts across refetches — the response streams
 * into the boundary underneath as the only observable effect.
 *
 * Boundary identity is derived, never declared: contexts captured per call
 * key a WeakMap of boundaries (dying with their call sites); ownerless calls
 * fall back to one boundary per function id.
 */
export function createServerComponentHandler<C>(
  options: ServerComponentHandlerOptions<C>
): {
  capture?(info: { id: string; meta: unknown }): unknown;
  handle(response: Response, ctx: { id: string; meta: unknown; args: unknown[]; context: unknown }): C | undefined;
};
