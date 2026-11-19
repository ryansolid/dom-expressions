import * as r from "../../src/server";

describe("r.setTrustedTypesPolicy on the server", () => {
  it("is a no-op, so an isomorphic entry can call it", () => {
    const createHTML = jest.fn(html => html);
    expect(() => r.setTrustedTypesPolicy({ createHTML })).not.toThrow();
    expect(() => r.setTrustedTypesPolicy(undefined)).not.toThrow();
    expect(createHTML).not.toHaveBeenCalled();
  });
});
