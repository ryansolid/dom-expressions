import type { JSONCodecOptions } from "./serializer-decode.js";

export function frameAddress(id: string, args?: unknown[]): string;
export function createChunk(data: string): Uint8Array;

export class ChunkReader implements AsyncIterator<string> {
  constructor(stream: ReadableStream<Uint8Array>);
  next(): Promise<IteratorResult<string>>;
  drain(interpret: (value: string) => void): Promise<void>;
}

export function serializeFrameValue(
  value: unknown,
  codecOptions?: JSONCodecOptions
): ReadableStream<Uint8Array>;

export function deserializeFrameValue(
  source: Request | Response,
  codecOptions?: JSONCodecOptions
): Promise<unknown>;
