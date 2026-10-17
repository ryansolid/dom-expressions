/**
 * @jest-environment jsdom
 */
import { runInNewContext } from "node:vm";
import { createPlugin } from "seroval";
import { sharedConfig } from "rxcore";
import * as r from "../../src/server";

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

const pointPlugin = createPlugin({
  tag: "Point",
  test: value => value instanceof Point,
  parse: {
    stream(value, ctx) {
      return { x: ctx.parse(value.x), y: ctx.parse(value.y) };
    }
  },
  serialize(node, ctx) {
    return `new Point(${ctx.serialize(node.x)},${ctx.serialize(node.y)})`;
  },
  deserialize(node, ctx) {
    return new Point(ctx.deserialize(node.x), ctx.deserialize(node.y));
  }
});

function createClient() {
  const client = {
    _$HY: { r: {}, fe() {} },
    document,
    pending: []
  };
  client.self = client;
  return client;
}

function runScripts(html, client) {
  for (const [, source] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    runInNewContext(source, client);
  }
}

function collect(stream) {
  const chunks = [];
  let resolveFirst;
  const first = new Promise(resolve => (resolveFirst = resolve));
  const done = new Promise(resolve => {
    stream.pipe({
      write(chunk) {
        chunks.push(chunk);
        resolveFirst();
      },
      end() {
        resolve(chunks.join(""));
      }
    });
  });
  return { first, done };
}

describe("transformSerializedScript", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each(["renderToString", "renderToStringAsync", "renderToStream"])(
    "%s can schedule synchronous custom data until its deserializer is ready",
    async renderer => {
      const transform = jest.fn(source => `pending.push(()=>{${source}})`);
      const options = {
        plugins: [pointPlugin],
        nonce: "serialization-nonce",
        transformSerializedScript: transform
      };
      const component = () => {
        sharedConfig.context.serialize("point", new Point(5, 10));
        return r.ssr`<p>rendered</p>`;
      };
      const html =
        renderer === "renderToStream"
          ? await collect(r.renderToStream(component, options)).done
          : await r[renderer](component, options);
      const client = createClient();

      expect(html).toContain('<script nonce="serialization-nonce">');
      expect(html).toContain("<p>rendered</p>");
      expect(transform).toHaveBeenCalledTimes(1);
      expect(() => runScripts(html, client)).not.toThrow();
      expect(client.pending).toHaveLength(1);
      expect(client._$HY.r.point).toBeUndefined();

      client.Point = Point;
      client.pending.forEach(run => run());

      expect(client._$HY.r.point).toBeInstanceOf(Point);
      expect(client._$HY.r.point).toEqual(new Point(5, 10));
    }
  );

  it("keeps native streamed DOM patches working before custom data can run", async () => {
    let resolvePoint;
    const point = new Promise(resolve => (resolvePoint = resolve));
    let finishFragment;
    const transform = jest.fn(source => `pending.push(()=>{${source}})`);
    const stream = r.renderToStream(
      () => {
        finishFragment = sharedConfig.context.registerFragment("fragment");
        sharedConfig.context.serialize("point", point);
        return r.ssr`<div id="app"><span id="pl-fragment">pending</span><!--pl-fragment--></div>`;
      },
      { plugins: [pointPlugin], transformSerializedScript: transform, nonce: "stream-nonce" }
    );
    const output = collect(stream);
    await output.first;
    resolvePoint(new Point(8, 12));
    finishFragment('<p id="resolved">streamed</p>');
    const html = await output.done;
    const client = createClient();
    document.body.innerHTML = html;

    expect(transform.mock.calls.every(([source]) => !source.includes("$df"))).toBe(true);
    expect(html).toContain('<script nonce="stream-nonce">');
    expect(() => runScripts(html, client)).not.toThrow();
    expect(document.querySelector("#app").textContent).toBe("streamed");
    expect(typeof client.$df).toBe("function");
    expect(client._$HY.r.point).toBeUndefined();

    client.Point = Point;
    client.pending.forEach(run => run());

    await expect(client._$HY.r.point).resolves.toEqual(new Point(8, 12));
  });

  it("leaves default serialization identical to an identity transform", () => {
    const component = () => {
      sharedConfig.context.serialize("point", new Point(1, 2));
      return r.ssr`<p>identity</p>`;
    };
    const original = r.renderToString(component, { plugins: [pointPlugin] });
    const identity = r.renderToString(component, {
      plugins: [pointPlugin],
      transformSerializedScript: source => source
    });

    expect(identity).toBe(original);
  });

  it("preserves shared nested values and serialized string escaping", () => {
    const point = new Point(3, 4);
    const value = { point, nested: [point], text: '</script>\u2028"\\' };
    const html = r.renderToString(
      () => {
        sharedConfig.context.serialize("value", value);
        return r.ssr`<p>nested</p>`;
      },
      {
        plugins: [pointPlugin],
        transformSerializedScript: source => `pending.push(()=>{${source}})`
      }
    );
    const client = createClient();
    runScripts(html, client);
    client.Point = Point;
    client.pending.forEach(run => run());

    expect(client._$HY.r.value).toEqual(value);
    expect(client._$HY.r.value.point).toBeInstanceOf(Point);
    expect(client._$HY.r.value.point).toBe(client._$HY.r.value.nested[0]);
  });
});
