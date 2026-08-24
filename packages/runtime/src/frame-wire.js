export function frameAddress(id, args) {
  return args && args.length ? id + ":" + hashArguments(args) : id;
}

function hashArguments(args) {
  let hash = 0;
  const text = stableString(args);
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36);
}

function stableString(value, seen) {
  if (value === null || typeof value !== "object") {
    return typeof value === "bigint" ? value + "n" : String(value);
  }
  if (value instanceof Date) return "Date:" + value.getTime();
  seen || (seen = new Set());
  if (seen.has(value)) return "~";
  seen.add(value);
  if (value instanceof Map) {
    const entries = [];
    for (const [key, item] of value) {
      entries.push(stableString(key, seen) + "=>" + stableString(item, seen));
    }
    return "Map{" + entries.sort().join(",") + "}";
  }
  if (value instanceof Set) {
    const members = [];
    for (const item of value) members.push(stableString(item, seen));
    return "Set{" + members.sort().join(",") + "}";
  }
  if (Array.isArray(value)) {
    let out = "[";
    for (let i = 0; i < value.length; i++) {
      out += (i ? "," : "") + stableString(value[i], seen);
    }
    return out + "]";
  }
  const keys = Object.keys(value).sort();
  let out = "{";
  for (let i = 0; i < keys.length; i++) {
    out += (i ? "," : "") + keys[i] + ":" + stableString(value[keys[i]], seen);
  }
  return out + "}";
}

export function createChunk(data) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const chunk = new Uint8Array(12 + encoded.length);
  chunk.set(encoder.encode(`;0x${encoded.length.toString(16).padStart(8, "0")};`));
  chunk.set(encoded, 12);
  return chunk;
}

export class ChunkReader {
  constructor(stream) {
    this.reader = stream.getReader();
    this.buffer = new Uint8Array(0);
    this.done = false;
  }

  async readChunk() {
    const chunk = await this.reader.read();
    if (chunk.done) {
      this.done = true;
      return;
    }
    const buffer = new Uint8Array(this.buffer.length + chunk.value.length);
    buffer.set(this.buffer);
    buffer.set(chunk.value, this.buffer.length);
    this.buffer = buffer;
  }

  async next() {
    while (this.buffer.length < 12) {
      if (this.done) {
        if (this.buffer.length === 0) return { done: true, value: undefined };
        throw new Error("Malformed frame stream.");
      }
      await this.readChunk();
    }
    const decoder = new TextDecoder();
    const bytes = Number.parseInt(decoder.decode(this.buffer.subarray(1, 11)), 16);
    if (Number.isNaN(bytes)) throw new Error("Malformed frame stream.");
    while (bytes > this.buffer.length - 12) {
      if (this.done) throw new Error("Malformed frame stream.");
      await this.readChunk();
    }
    const value = decoder.decode(this.buffer.subarray(12, 12 + bytes));
    this.buffer = this.buffer.subarray(12 + bytes);
    return { done: false, value };
  }

  async drain(interpret) {
    for (let result = await this.next(); !result.done; result = await this.next()) {
      interpret(result.value);
    }
  }
}

export function serializeFrameValue(value, codecOptions) {
  return new ReadableStream({
    async start(controller) {
      const { serializeJSON } = await import("./serializer.js");
      serializeJSON(value, {
        ...codecOptions,
        onParse(node) {
          controller.enqueue(createChunk(JSON.stringify(node)));
        },
        onDone() {
          controller.close();
        },
        onError(error) {
          controller.error(error);
        }
      });
    }
  });
}

export async function deserializeFrameValue(source, codecOptions) {
  if (!source.body) throw new Error("missing body");
  const reader = new ChunkReader(source.body);
  const result = await reader.next();
  if (result.done) return undefined;
  const { createJSONDeserializer } = await import("./serializer-decode.js");
  const deserialize = createJSONDeserializer(codecOptions);
  const interpret = chunk => deserialize(JSON.parse(chunk));
  reader.drain(interpret).then(
    () => deserialize.abort(new Error("Frame stream ended unexpectedly.")),
    error => deserialize.abort(error)
  );
  return interpret(result.value);
}
