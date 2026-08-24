/**
 * @jest-environment node
 */
import {
  ResponseEnvelope,
  isHref,
  isResponseEnvelope,
  redirect,
  reload,
  respond
} from "../../src/response";

describe("response helpers", () => {
  it("creates redirects with status and revalidation metadata", () => {
    const response = redirect("/login");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");

    const custom = redirect("/next", { status: 307, revalidate: ["/notes", "/tags"] });
    expect(custom.status).toBe(307);
    expect(custom.headers.get("X-Revalidate")).toBe("/notes,/tags");
    expect(redirect("/x", 303).status).toBe(303);
  });

  it("creates reload responses with revalidation metadata", () => {
    expect(reload().headers.get("X-Revalidate")).toBeNull();
    expect(reload({ revalidate: "/notes" }).headers.get("X-Revalidate")).toBe("/notes");
  });

  it("accepts branded href values", () => {
    const path = {
      [Symbol.for("solid.Href")]: true,
      toString: () => "/users/5"
    };
    expect(isHref(path)).toBe(true);
    expect(redirect(path).headers.get("Location")).toBe("/users/5");
    expect(isHref({ toString: () => "/x" })).toBe(false);
    expect(() => redirect({ toString: () => "/x" })).toThrow(TypeError);
  });

  it("recognizes envelopes across module copies", () => {
    class OtherCopy {
      constructor(response, value) {
        this.response = response;
        this.value = value;
      }
    }
    OtherCopy.prototype[Symbol.for("solid.ResponseEnvelope")] = true;
    const envelope = new OtherCopy(undefined, 1);
    expect(isResponseEnvelope(envelope)).toBe(true);
    expect(envelope).not.toBeInstanceOf(ResponseEnvelope);
  });

  it("pairs values with response metadata", async () => {
    const result = respond({ ok: true }, { revalidate: "/notes", status: 201 });
    expect(result).toBeInstanceOf(ResponseEnvelope);
    expect(result.value).toEqual({ ok: true });
    expect(result.response.status).toBe(201);
    expect(result.response.headers.get("X-Revalidate")).toBe("/notes");
    expect(await result.response.json()).toEqual({ ok: true });
  });
});
