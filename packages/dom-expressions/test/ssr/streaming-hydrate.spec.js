/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import { data } from "s-js";
import { sharedConfig } from "../core";

describe("streaming root hydration", () => {
  it.each(["text", "portal"])("removes streamed content beginning with %s", kind => {
    globalThis._$HY = { events: [], completed: new WeakSet() };
    const container = document.createElement("div");
    container.innerHTML = "<template></template><p>Loading...</p><!--placeholder-->";
    document.body.appendChild(container);

    const content = data(undefined);
    let context;
    const dispose = r.hydrate(() => {
      context = sharedConfig.context;
      return content;
    }, container);

    try {
      // Streaming replaces the initial nodes before Suspense resumes hydration.
      container.innerHTML = 'Video detail<img data-hk="0">';
      const text = container.firstChild;
      const image = container.lastChild;
      sharedConfig.gather();
      sharedConfig.context = context;
      const hydratedImage = r.getNextElement(r.template("<img>"));
      content(
        kind === "text"
          ? ["Video detail", hydratedImage]
          : [document.createTextNode(""), ["Video detail", hydratedImage]]
      );
      sharedConfig.context = null;

      expect(container.firstChild).toBe(text);
      expect(container.lastChild).toBe(image);
      expect(container.childNodes.length).toBe(2);

      // Client navigation must remove the streamed nodes, not the old fallback.
      const nextPage = document.createElement("h1");
      nextPage.textContent = "Video list";
      content([nextPage]);
      expect(container.innerHTML).toBe("<h1>Video list</h1>");
      expect(text.isConnected).toBe(false);
      expect(image.isConnected).toBe(false);
    } finally {
      sharedConfig.context = null;
      dispose();
      container.remove();
    }
  });
});
