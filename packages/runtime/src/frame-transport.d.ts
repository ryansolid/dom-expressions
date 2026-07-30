import { FrameChunk, FrameHost } from "./frame-client.js";
import { JSONCodecOptions } from "./serializer.js";

// Structural mirror of server-functions/shared.js's FlightDataConsumer:
// this file may only reference siblings that ship with it when integrations
// copy the frames declaration set (solid-web's types build), and the
// server-functions declarations are copied to a different root.
type FlightConsumer = (data: unknown, context: { response: Response }) => void | Promise<void>;

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
   * counter to make policy A's stale-guard real across navigations. A
   * single-flight response addresses several boundaries, each with its own
   * history — pass a function and it is called once per frame in the
   * response.
   */
  version?: number | ((frameId: string) => number);
  /**
   * Remap any frame id other than the response's own root onto a local one
   * — how a consumer resolves the addresses a single-flight response uses
   * for the regions it refreshed.
   */
  route?(id: string): string;
  /**
   * Receives the payload text of each `outcome` chunk — the response-scoped
   * single-flight envelope, the caller's result rather than anything the
   * host renders.
   */
  onOutcome?(payload: string): void;
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

/** Brands an inline-rendered server component with its function id. */
export const SERVER_COMPONENT: unique symbol;

/** The unwrapped server component behind an inline-render wrap. */
export const SERVER_COMPONENT_SOURCE: unique symbol;

/** The call's wire address (`frameAddress`), for regions to be emitted under. */
export const SERVER_COMPONENT_ADDRESS: unique symbol;

/**
 * Seroval plugin for a server component crossing a serialization boundary:
 * a branded component serializes as a REFERENCE — a per-function document
 * placeholder in the hydration serializer, a live-registry lookup by call
 * address in the JSON codec (single-flight envelopes) — its markup never
 * rides as data.
 */
export const ServerComponentPlugin: unknown;

/**
 * The codec options for a single-flight envelope: `codec` plus
 * `ServerComponentPlugin` (deduped by tag). Injected by the protocol on both
 * legs; exported for integrations composing their own flight carriers.
 */
export function flightCodec(codec?: JSONCodecOptions): JSONCodecOptions;

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
   * A new response is about to stream into a boundary: rotate
   * response-scoped state (codec data tables) here. `version` is the
   * client-owned stream counter the chunks will be stamped with.
   */
  onStream?(frameId: string, version: number, response: Response): void;
  /**
   * Document-SSR adoption: given a boundary id the page already carries
   * (server-rendered between `frame:<id>` markers), return the component
   * that adopts that range — or `undefined` to stream normally. Consulted
   * once per boundary, before any fetch.
   */
  documentComponent?(frameId: string): C | undefined;
  /**
   * Answer a call SYNCHRONOUSLY before any request is made (t = 0 local
   * answers — e.g. a boundary the document already carries). Returning a
   * non-undefined value resolves the call with it; a hydrating consumer
   * never observes a pending beat.
   */
  intercept?(info: { id: string; meta: unknown; args: unknown[] }): C | undefined;
  /**
   * Reads the registered single-flight consumer at delivery time. The
   * consumer is module state in the server-function client's SHARED
   * instance; pass a getter reading that instance when your bundling gives
   * this module a private copy. Defaults to the local copy's reader.
   */
  consumer?(): FlightConsumer | undefined;
  /**
   * Reads the configured codec options at decode time — same instance-
   * identity contract as `consumer`. Defaults to the local copy's reader.
   */
  codec?(): JSONCodecOptions | undefined;
}

/**
 * The client mirror of `frameTransformResult`, shaped for the server-function
 * client's `responseHandler` seam: frame-stream responses resolve the call
 * with a **stable component** instead of data, so an equals-gated consumer
 * (Solid's `dynamic`) never remounts across refetches — the response streams
 * into the boundary underneath as the only observable effect.
 *
 * Boundary identity is derived, never declared: every call keys by its
 * intrinsic (function, arguments) address — the query cache's per-args rule,
 * so cached components and boundaries stay one-to-one. Same-args calls
 * resolve the identical component and morph in place; an args switch swaps
 * boundaries, re-materialized from the host's retained state.
 */
export function createServerComponentHandler<C>(options: ServerComponentHandlerOptions<C>): {
  intercept?(info: { id: string; meta: unknown; args: unknown[] }): C | undefined;
  handle(
    response: Response,
    ctx: { id: string; meta: unknown; args: unknown[]; context: unknown }
  ): C | undefined;
  /**
   * Declares that the document is showing a call: hydration-data references
   * carry their call's address (`_$SC.r(id, address)`) but never travel
   * through the transport, so the integration forwards those records here —
   * they are how a post-load call for the same (function, arguments) finds
   * its way back to the adopted boundary. `component` must be the exact
   * reference the integration's cache holds for the call (the per-function
   * placeholder), or readers' equals-gates fail into remounts.
   */
  showing(address: string, functionId: string, component: C): void;
};
