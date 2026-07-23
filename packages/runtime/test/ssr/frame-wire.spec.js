/**
 * @jest-environment node
 *
 * Wire-level framing robustness: the length-prefixed chunk protocol
 * (createChunk / ChunkReader) must tolerate arbitrary network read
 * boundaries. TCP/proxies/compression re-segment freely — a reader may
 * receive half a header, a header split from its payload, or several
 * chunks coalesced. The frame path (applyFrameResponse) and the
 * server-function codec (deserializeStream) both sit on this reader.
 */
import { createChunk, ChunkReader } from "../../src/server-functions/shared.js";

const PAYLOADS = [
  '{"type":"start","id":"f0","version":1}',
  '{"type":"html","id":"f0","version":1,"html":"<section>Hello 世界</section>"}',
  '{"type":"complete","id":"f0","version":1}'
];

function concatBytes(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function streamFromReads(reads) {
  return new ReadableStream({
    start(controller) {
      for (const r of reads) controller.enqueue(r);
      controller.close();
    }
  });
}

async function drainAll(reader) {
  const values = [];
  let result = await reader.next();
  while (!result.done) {
    values.push(result.value);
    result = await reader.next();
  }
  return values;
}

describe("ChunkReader network-boundary tolerance", () => {
  const wire = concatBytes(PAYLOADS.map(createChunk));

  it("reads chunks delivered whole (baseline)", async () => {
    const reader = new ChunkReader(streamFromReads(PAYLOADS.map(createChunk)));
    expect(await drainAll(reader)).toEqual(PAYLOADS);
  });

  it("reads chunks when a read boundary splits a frame header", async () => {
    // Cut 5 bytes into the second chunk's 12-byte header.
    const cut = createChunk(PAYLOADS[0]).length + 5;
    const reader = new ChunkReader(
      streamFromReads([wire.subarray(0, cut), wire.subarray(cut)])
    );
    expect(await drainAll(reader)).toEqual(PAYLOADS);
  });

  it("survives every possible two-read split position", async () => {
    for (let cut = 1; cut < wire.length; cut++) {
      const reader = new ChunkReader(
        streamFromReads([wire.subarray(0, cut), wire.subarray(cut)])
      );
      let values;
      try {
        values = await drainAll(reader);
      } catch (err) {
        throw new Error(`split at byte ${cut} threw: ${err.message}`);
      }
      if (values.length !== PAYLOADS.length || values.some((v, i) => v !== PAYLOADS[i])) {
        throw new Error(`split at byte ${cut} produced ${JSON.stringify(values)}`);
      }
    }
  });

  it("survives byte-at-a-time delivery", async () => {
    const reads = [];
    for (let i = 0; i < wire.length; i++) reads.push(wire.subarray(i, i + 1));
    const reader = new ChunkReader(streamFromReads(reads));
    expect(await drainAll(reader)).toEqual(PAYLOADS);
  });

  it("rejects a stream truncated mid-payload instead of yielding garbage", async () => {
    const reader = new ChunkReader(streamFromReads([wire.subarray(0, 20)]));
    await expect(drainAll(reader)).rejects.toThrow(/[Mm]alformed/);
  });

  it("rejects a stream truncated mid-header instead of yielding garbage", async () => {
    const reader = new ChunkReader(streamFromReads([wire.subarray(0, 7)]));
    await expect(drainAll(reader)).rejects.toThrow(/[Mm]alformed/);
  });
});
