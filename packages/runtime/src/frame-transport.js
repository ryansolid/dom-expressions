/**
 * Frame stream HTTP transport, client half: recognize a frame-tagged
 * server-function Response and pump its framed chunks into a frame host.
 *
 * The wire convention is shared with the server-function transport — each
 * chunk is length-prefixed (`;0x` + 32-bit hex byte length + `;`) UTF-8 of
 * `JSON.stringify(FrameChunk)` — so both transports read and write through
 * the one framing implementation in server-functions/shared.js. The server
 * half (`serverComponentResponse` / `frameTransformResult`) lives in
 * frame-sink.js; this module stays importable from client bundles.
 */
import { ChunkReader } from "./server-functions/shared.js";

/**
 * Header tagging a Response as a frame stream; its value is the producing
 * frame's id. Frame-owned contract (hence the namespace) — deliberately not
 * a `BodyFormat` entry, since the body is frame chunks, not a serialized
 * value.
 */
export const FRAME_STREAM_HEADER = "X-Frame-Stream";

/** Whether a fetch Response carries a frame stream. */
export function isFrameStreamResponse(response) {
  return response.headers.has(FRAME_STREAM_HEADER);
}

/**
 * Reads a frame-stream Response to completion, applying every chunk to
 * `host`. The client owns boundary identity: pass `options.as` to remap the
 * producer's root frame id onto a local one (the id your insertable/frame
 * registered under), so navigations to the same boundary reuse the same
 * frame regardless of what the server called it. Resolves with the id the
 * chunks were applied under once the stream ends.
 */
export async function applyFrameResponse(response, host, options = {}) {
  const rootId = response.headers.get(FRAME_STREAM_HEADER) ?? "";
  const as = options.as;
  const reader = new ChunkReader(response.body);
  let result = await reader.next();
  while (!result.done) {
    const chunk = JSON.parse(result.value);
    if (as !== undefined && chunk.id === rootId) chunk.id = as;
    host.apply(chunk);
    result = await reader.next();
  }
  return as !== undefined ? as : rootId;
}
