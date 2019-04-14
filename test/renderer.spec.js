const { createRuntime } = require('../lib/dom-expressions');
const r = createRuntime({wrap: fn => fn()});

function mockFactory(runtime, options) {
  return { runtime, options };
}

describe("test renderer factory", () => {
  it("creates factory", () => {
    const renderer = r.registerRenderer('mock', mockFactory, {something: true});
    expect(renderer).toBeDefined();
    expect(renderer.runtime).toBe(r);
    expect(renderer.options.something).toBe(true);
  });

  it("retrieves factory", () => {
    const renderer = r.renderer('mock');
    expect(renderer).toBeDefined();
    expect(renderer.runtime).toBe(r);
    expect(renderer.options.something).toBe(true);
  });

  it("throws on duplicate register", () => {
    expect(() => {
      r.registerRenderer('mock', mockFactory, {something: 'else'});
    }).toThrow();
  });

  it("throws on missing renderer", () => {
    expect(() => {
      const renderer = r.renderer('moo');
    }).toThrow();
  });
});