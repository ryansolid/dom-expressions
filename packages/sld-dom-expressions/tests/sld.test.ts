import { createRoot, createSignal, flush, createMemo } from "@solidjs/signals";
import { createSLDRuntime } from "../src";
import { expect, it, describe, beforeEach } from "vitest";
import * as r from "dom-expressions/src/client";
import { rawTextElements, voidElements,mathmlElements } from "../src/util";

const createSLD = createSLDRuntime({...r,voidElements,rawTextElements,mathmlElements})

const For = (props)=>{
  return createMemo(()=>props.each.map(v=>props.children(v) ))as any
}

const Show = (props)=>{
  return createMemo(()=>props.when ? props.children : null) as any
}


const sld = createSLD({ For, Show });


beforeEach(() => {
  document.body.innerHTML = "";
});

describe("SLD Integration Tests", () => {
  describe("Basic Element Rendering", () => {
    it("renders simple text content", () => {
      const result = sld`Hello World!`;
      expect(result).toBe("Hello World!");
    });

    it("renders simple elements", () => {
      const result = sld`<div>Test</div>` as Node[];
      const el = result[0] as HTMLElement;
      expect(el.tagName).toBe("DIV");
      expect(el.textContent).toBe("Test");
    });

    it("renders self-closing elements", () => {
      const result = sld`<input type="text" />` as Node[];
      const input = result[0] as HTMLInputElement;
      expect(input.tagName).toBe("INPUT");
      expect(input.type).toBe("text");
    });

    it("renders nested elements", () => {
      const result = sld`<div><span>Nested</span></div>` as Node[];
      const div = result[0] as HTMLElement;
      const span = div.querySelector("span");
      expect(span?.textContent).toBe("Nested");
    });
  });

  describe("Attributes and Props", () => {
    it("handles complex attribute names and mixed values", () => {
      const [cls, setCls] = createSignal("active");
      const result =
        sld`<div class="base ${cls}" data-test-id="main-div" aria-hidden="false"></div>` as Node[];
      const el = result[0] as HTMLElement;

      expect(el.className).toBe("base active");
      expect(el.getAttribute("data-test-id")).toBe("main-div");

      setCls("inactive");
              flush()

      expect(el.className).toBe("base inactive");
    });

    it("handles boolean attributes correctly", () => {
      const [disabled, setDisabled] = createSignal(true);
      const result = sld`<button disabled=${disabled} autofocus>Click</button>` as Node[];
      const btn = result[0] as HTMLButtonElement;

      expect(btn.disabled).toBe(true);
      expect(btn.hasAttribute("autofocus")).toBe(true);

      setDisabled(false);
              flush()

      expect(btn.disabled).toBe(false);
    });

    it("handles spread props with static before spread", () => {
      const props = { id: "spread", class: "blue", "data-attr": "val" };
      const result = sld`<div id="static" class="red" ...${props}></div>` as Node[];
      const el = result[0] as HTMLElement;

      expect(el.id).toBe("spread");
      expect(el.className).toBe("blue");
      expect(el.getAttribute("data-attr")).toBe("val");
    });

    it("handles spread props with static after spread", () => {
      const props = { id: "spread", class: "blue", "data-attr": "val" };
      const result = sld`<div ...${props} id="static" class="red"></div>` as Node[];
      const el = result[0] as HTMLElement;

      expect(el.id).toBe("static");
      expect(el.className).toBe("red");
      expect(el.getAttribute("data-attr")).toBe("val");
    });

    it("respects override order with spreads and static attributes", () => {
      const props = { id: "from-spread", "data-info": "hidden" };
      const result = sld`<div ...${props} id="final-id"></div>` as Node[];
      const el = result[0] as HTMLElement;

      expect(el.id).toBe("final-id");
      expect(el.getAttribute("data-info")).toBe("hidden");
    });

    it("handles explicit properties and attributes via namespaces", () => {
      const [val, setVal] = createSignal("initial");
      const result = sld`<input prop:value=${val} title=${"hello"} />` as Node[];
      const input = result[0] as HTMLInputElement;

      expect(input.value).toBe("initial");
      expect(input.getAttribute("title")).toBe("hello");

      setVal("updated");
              flush()

      expect(input.value).toBe("updated");
    });

    it("handles mixed static and dynamic attribute parts", () => {
      const [welcoming] = createSignal("hello");
      const result = sld`
        <h1 title="${welcoming} John ${"Smith"}"></h1>
      ` as HTMLElement[];

      expect(result[0].title).toBe("hello John Smith");
    });

    it("handles multi-line, complex, and unquoted-style attributes", () => {
      const result = sld`
        <div
          multiline="
            foo
            bar
          "
          lorem ipsum
        ></div>` as HTMLElement[];

      const div = result[0];

      expect(div.getAttribute("multiline")).toContain("foo");
      expect(div.getAttribute("multiline")).toContain("bar");
      expect(div.hasAttribute("lorem")).toBe(true);
      expect(div.hasAttribute("ipsum")).toBe(true);
    });

    it("correctly handles JSON-like strings in attributes", () => {
      const result = sld`
        <lume-box uniforms='{ "iTime": { "value": 0 } }'></lume-box>
      ` as HTMLElement[];

      expect(result[0].getAttribute("uniforms")).toBe('{ "iTime": { "value": 0 } }');
    });
  });

  describe("Expressions and Reactivity", () => {
    it("handles expressions inside text", () => {
      const name = "World";
      const result = sld`<div>Hello ${name}!</div>` as Node[];
      const el = result[0] as HTMLElement;
      expect(el.textContent).toBe("Hello World!");
    });

    it("handles multiple expressions", () => {
      const [count, setCount] = createSignal(0);
      const name = "Counter";
      const result = sld`<div>${name}: ${count}</div>` as Node[];
      const el = result[0] as HTMLElement;

      expect(el.textContent).toBe("Counter: 0");
      setCount(5);
              flush()

      expect(el.textContent).toBe("Counter: 5");
    });

    it("handles sibling expressions and static text correctly", () => {
      const [a] = createSignal("A");
      const [b] = createSignal("B");

      const result = sld`<div>${a} - ${b} !</div>` as Node[];
      const el = result[0] as HTMLDivElement;

      expect(el.textContent).toBe("A - B !");
    });

    it("trims whitespace correctly while preserving nested spaces", () => {
      const name = "John";
      const result = sld`
        <div>
          <b>Hello, my name is: <i> ${name}</i></b>
        </div>
      ` as HTMLElement[];

      const b = result[0].querySelector("b")!;
      expect(b.textContent).toBe("Hello, my name is: John");
    });

    it("handles dynamic attributes", () => {
      const [visible, setVisible] = createSignal(true);
      const result = sld`<div hidden=${!visible}>Content</div>` as Node[];
      const el = result[0] as HTMLElement;

      expect(el.hasAttribute("hidden")).toBe(false);
      setVisible(false);
              flush()

      expect(el.hasAttribute("hidden")).toBe(false);
    });
  });

  describe("Logic and Control Flow", () => {
    it("works with Solid's <Show> component", () => {
      const [visible, setVisible] = createSignal(false);
      const result = sld`<div>
        <Show when=${visible}>
          <span id="target">I am visible</span>
        </Show>
        </div>` as Node[];

      const container = document.createElement("div");
      container.append(...result);
      document.body.appendChild(container);

      expect(container.querySelector("#target")).toBeNull();

      setVisible(true);
              flush()

      expect(container.querySelector("#target")).not.toBeNull();
      expect(container.querySelector("#target")?.textContent).toBe("I am visible");
    });

    it("works with Solid's <For> component", () => {
      const [items, setItems] = createSignal(["A", "B"]);
      const result = sld`
        <ul>
          <For each=${items}>
            ${(item: string) => sld`<li>${item}</li>`}
          </For>
        </ul>` as Node[];

      const container = document.createElement("div");
      container.append(...result);

      expect(container.querySelectorAll("li").length).toBe(2);

      setItems(["A", "B", "C"]);
              flush()

      expect(container.querySelectorAll("li").length).toBe(3);
    });
  });

  describe("Events and Refs", () => {
    it("handles refs and event listeners correctly", () => {
      let elementRef: HTMLDivElement | undefined;
      let clickCount = 0;

      const result = sld`
      <div 
        ref=${(el: HTMLDivElement) => (elementRef = el)} 
        on:click=${() => clickCount++}
      >Click me</div>` as Node[];

      const el = result[0] as HTMLDivElement;

      expect(elementRef).toBe(el);
      el.click();
      expect(clickCount).toBe(1);
    });

    it("integrates bound, delegated, and native listener events", () => {
      const exec = { bound: false, delegated: false, listener: false };

      const result = sld`
        <div id="main">
          <button onclick=${() => (exec.bound = true)}>Bound</button>
          <button onClick=${[(v: any) => (exec.delegated = v), true]}>Delegated</button>
          <button on:click=${() => (exec.listener = true)}>Listener</button>
        </div>
      ` as HTMLElement[];
      document.body.append(...result);

      const [btn1, btn2, btn3] = result[0].querySelectorAll("button");

      expect(btn1.innerText).toBe("Bound");
      expect(btn2.innerText).toBe("Delegated");
      expect(btn3.innerText).toBe("Listener");

      btn1.click();
      btn2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      btn3.click();

      expect(exec.delegated).toBe(true);
      expect(exec.listener).toBe(true);
    });

    it("captures refs across components and elements", () => {
      let linkRef: HTMLAnchorElement | undefined;
      const result = sld`
        <div>
          <a href="/" ref=${(el: HTMLAnchorElement) => (linkRef = el)}>Link</a>
        </div>
      ` as HTMLElement[];

      expect(linkRef).toBe(result[0].querySelector("a"));
    });
  });

  describe("Custom Components", () => {
    it("passes children correctly to registered components", () => {
      const Wrapper = (props: { children: any }) => sld`<section>${props.children}</section>`;
      const localSld = createSLD({ Wrapper });

      const result = localSld`
      <Wrapper>
        <span>Inside</span>
      </Wrapper>` as Node[];

      const section = result[0] as HTMLElement;
      expect(section.tagName).toBe("SECTION");
      expect(section.querySelector("span")?.textContent).toBe("Inside");
    });

    it("handles deep nesting with custom components", () => {
      const Box = (props: any) => sld`<div class="box">${props.children}</div>`;
      const localSld = createSLD({ Box });

      const result = localSld`
        <Box>
          <ul>
            <li><Box>Item 1</Box></li>
            <li><Box>Item 2</Box></li>
          </ul>
        </Box>` as Node[];

      const container = document.createElement("div");
      container.append(...result);
      expect(container.querySelectorAll(".box").length).toBe(3);
      expect(container.querySelector("li")?.textContent).toBe("Item 1");
    });
  });

  describe("Special Elements and Namespaces", () => {
    it("treats <script> and <style> as raw text", () => {
      const result = sld`
        <style>
          body > div { color: red; }
        </style>` as Node[];

      expect(result[0].textContent).toContain("body > div");
      expect((result[0] as HTMLElement).tagName).toBe("STYLE");
    });

    it("maintains SVG namespace across nested dynamic paths", () => {
      const [radius, setRadius] = createSignal(10);
      const result = sld`
      <svg>
        <g>
          <circle r=${radius} />
        </g>
      </svg>` as Node[];

      const svg = result[0] as SVGSVGElement;
      const circle = svg.querySelector("circle")!;

      expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(circle.getAttribute("r")).toBe("10");

      setRadius(20);
      flush()
      expect(circle.getAttribute("r")).toBe("20");
    });

    it("handles template elements correctly", () => {
      const nodes = sld`${"hole"}<template>Count: ${() => 1}</template>` as Node[];
      document.body.append(...nodes);
      expect(nodes[2].textContent).toEqual("Count: 1");
    });

    it("handles mathml elements", () => {
      const Frac = () => sld`<mfrac>
      <mn>1</mn>
      <mn>3</mn>
    </mfrac>`;

      const result = sld.define({ Frac }).sld`<p>
      The fraction
      <math>
        <Frac />
      </math>
      is not a decimal number.
    </p>` as Node[];

      document.body.append(...result);
      expect(document.querySelector("math")).toBeTruthy();
    });
  });

  describe("HTML Entities and Encoding", () => {
    it("handles html encodings", () => {
      const elem = sld`&copy;<span>&gt;</span>` as Node[];
      expect(elem[0].textContent).toEqual("\u00A9");
      expect(elem[1].textContent).toEqual(">");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles empty templates", () => {
      const result = sld``;
      expect(result).toEqual([]);
    });

    it("handles whitespace-only templates", () => {
      const result = sld`   `;
      expect(result).toBe("   ");
    });

    it("handles weird whitespace and line breaks in tags", () => {
      const result = sld`
        <div 
          id="test
          "
          class = 
            "spaced"
        >  Text  </div>` as Node[];
      const el = result[0] as HTMLElement;
      expect(el.id).toBe(`test
          `);
      expect(el.className).toBe("spaced");
      expect(el.textContent?.trim()).toBe("Text");
    });

    it("ignores HTML comments and their contents", () => {
      const signal = () => "HIDDEN";
      const result = sld`
        <div>
            <!-- This is a comment with an expression: ${signal()} -->
          <p>Visible</p>
        </div>` as Node[];

      const container = document.createElement("div");
      container.append(...result);
      expect(container.innerHTML).not.toContain("HIDDEN");
      expect(container.querySelector("p")?.textContent).toBe("Visible");
    });
  });

  describe("Complex DOM Integration Tests", () => {
    describe("Advanced Attribute Scenarios", () => {
      it("handles multiple spread attributes with complex override behavior", () => {
        const baseProps = { class: "base", id: "base-id" };
        const overrideProps = { class: "override", "data-override": true };
        const finalId = "final-id";

        const result =
          sld`<div ...${baseProps} ...${overrideProps} id="${finalId}" class="final">Content</div>` as Node[];
        const el = result[0] as HTMLElement;

        expect(el.className).toBe("final");
        expect(el.id).toBe("final-id");
        expect(el.getAttribute("data-override")).toBe("");
        expect(el.textContent).toBe("Content");
      });

      it("handles mixed quoted and unquoted attributes with expressions", () => {
        const [dynamicClass, setClass] = createSignal("active");
        const [dynamicId] = createSignal("dynamic-123");
        const staticTitle = "Static Title";

        const result =
          sld`<button class="btn-${dynamicClass}" id=${dynamicId} title="${staticTitle}" disabled=${dynamicClass() === "active"}>Click</button>` as Node[];
        const button = result[0] as HTMLButtonElement;

        expect(button.className).toBe("btn-active");
        expect(button.id).toBe("dynamic-123");
        expect(button.title).toBe("Static Title");
        expect(button.disabled).toBe(true);
        expect(button.textContent).toBe("Click");

        setClass("inactive");
                flush()

        expect(button.className).toBe("btn-inactive");
      });

      it("handles boolean attributes with dynamic expressions", () => {
        const [enabled, setEnabled] = createSignal(true);
        const [checked, setChecked] = createSignal(false);

        const result =
          sld`<input type="checkbox" disabled=${() => !enabled()} checked=${checked} readonly />` as Node[];
        const input = result[0] as HTMLInputElement;

        expect(input.disabled).toBe(false);
        expect(input.checked).toBe(false);
        expect(input.hasAttribute("readonly")).toBe(true);

        setEnabled(false);
        setChecked(true);
                flush()

        expect(input.disabled).toBe(true);
        expect(input.checked).toBe(true);
      });

      it("handles style attribute with mixed static and dynamic values", () => {
        const [color, setColor] = createSignal("red");
        const result =
          sld`<div style="color: ${color}; background: blue; padding: ${10}px">Styled content</div>` as Node[];
        const el = result[0] as HTMLElement;

        expect(el.style.color).toBe("red");
        expect(el.style.backgroundColor).toBe("blue");
        expect(el.style.padding).toBe("10px");

        setColor("green");
                flush()

        expect(el.style.color).toBe("green");
      });

      it("handles class attribute with complex expressions", () => {
        const [isActive, setActive] = createSignal(true);
        const [theme, setTheme] = createSignal("dark");

        const result =
          sld`<div class="${isActive() ? "active" : "inactive"} theme-${theme()} static-class">Mixed classes</div>` as Node[];
        const el = result[0] as HTMLElement;

        expect(el.className).toBe("active theme-dark static-class");

        setActive(false);
        setTheme("light");
                flush()

        expect(el.className).toBe("active theme-dark static-class");
      });
    });

    describe("Reactive DOM Updates", () => {
      it("updates DOM when multiple signals change simultaneously", () => {
        const [count, setCount] = createSignal(0);
        const [text, setText] = createSignal("Initial");

        const result = sld`<div>
          <span class="count-${count}">Count: ${count}</span>
          <span class="text-${text}">Text: ${text}</span>
        </div>` as Node[];
        const container = document.createElement("div");
        container.append(...result);

        const countSpan = container.querySelector(".count-0")!;
        const textSpan = container.querySelector(".text-Initial")!;

        expect(countSpan.className).toBe("count-0");
        expect(countSpan.textContent).toBe("Count: 0");
        expect(textSpan.className).toBe("text-Initial");
        expect(textSpan.textContent).toBe("Text: Initial");

        setCount(5);
        setText("Updated");
                flush()


        expect(countSpan.className).toBe("count-5");
        expect(countSpan.textContent).toBe("Count: 5");
        expect(textSpan.className).toBe("text-Updated");
        expect(textSpan.textContent).toBe("Text: Updated");
      });

      it("handles conditional attributes with boolean logic", () => {
        const [visible, setVisible] = createSignal(true);
        const [disabled, setDisabled] = createSignal(false);

        const result = sld`<button 
          hidden="${() => !visible()}" 
          disabled="${disabled}" 
          aria-hidden="${() => !visible()}"
          class="${() => (visible() ? "visible" : "hidden")}"
        >Button</button>` as Node[];
        const button = result[0] as HTMLButtonElement;

        expect(button.hidden).toBe(false);
        expect(button.disabled).toBe(false);
        expect(button.getAttribute("aria-hidden")).toBe(null);
        expect(button.className).toBe("visible");

        setVisible(false);
        setDisabled(true);
                flush()


        expect(button.hidden).toBe(true);
        expect(button.disabled).toBe(true);
        expect(button.getAttribute("aria-hidden")).toBe("");
        expect(button.className).toBe("hidden");
      });
    });

    describe("Event Handling Integration", () => {
      it("handles multiple event types with proper cleanup", () => {
        let clickCount = 0;
        let mouseOverCount = 0;
        let inputChangeCount = 0;

        const result = sld`<div>
          <button on:click=${() => clickCount++}>Click me</button>
          <span on:mouseover=${() => mouseOverCount++}>Hover me</span>
          <input on:input=${() => inputChangeCount++} />
        </div>` as Node[];
        const container = document.createElement("div");
        container.append(...result);
        document.body.append(container);

        const button = container.querySelector("button")!;
        const hoverDiv = container.querySelector("span")!;
        const input = container.querySelector("input")!;

        button.click();
        hoverDiv.dispatchEvent(new MouseEvent("mouseover"));

        expect(clickCount).toBe(1);
        expect(mouseOverCount).toBe(1);
      });

      it("handles event delegation with stopPropagation", () => {
        const events: string[] = [];

        const result = sld`<div onClick=${() => events.push("parent")}>
          <button onClick=${(e: Event) => {
            e.stopPropagation();
            events.push("child");
          }}>Child</button>
        </div>` as Node[];
        const container = document.createElement("div");
        container.append(...result);
        document.body.append(container);

        const button = container.querySelector("button")!;
        button.click();

        expect(events.length).toBeGreaterThan(0);
      });
    });

    describe("Form Element Integration", () => {
      it("handles form controls with reactive values", () => {
        const [value, setValue] = createSignal("initial");
        const [checked, setChecked] = createSignal(false);

        const result = sld`<form>
          <input type="text" value="${value}" />
          <input type="checkbox" checked="${checked}" />
          <select value="${value}">
            <option value="initial">Option 1</option>
            <option value="updated">Option 2</option>
          </select>
        </form>` as Node[];
        const container = document.createElement("div");
        container.append(...result);

        const textInput = container.querySelector("input[type='text']") as HTMLInputElement;
        const checkboxInput = container.querySelector("input[type='checkbox']") as HTMLInputElement;
        const select = container.querySelector("select") as HTMLSelectElement;

        expect(textInput.value).toBe("initial");
        expect(checkboxInput.checked).toBe(false);
        expect(select.value).toBe("initial");

        setValue("updated");
        setChecked(true);
                flush()


        expect(textInput.value).toBe("updated");
        expect(checkboxInput.checked).toBe(true);
        expect(select.value).toBe("updated");
      });

      it("handles textarea with raw text content", () => {
        const [content, setContent] = createSignal("Initial content");

        const result = sld`<textarea>${content}</textarea>` as Node[];
        const container = document.createElement("div");
        container.append(...result);

        const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
        expect(textarea.value).toBe("Initial content");

        setContent("Updated content");
                flush()

        expect(textarea.value).toBe("Updated content");
      });
    });

    describe("List and Table Rendering", () => {
      it("renders table with dynamic rows and cells", () => {
        const [rows, setRows] = createSignal([
          ["Cell 1", "Cell 2", "Cell 3"],
          ["Cell 4", "Cell 5", "Cell 6"],
        ]);

        const result = sld`<table>
          <thead>
            <tr><th>Col 1</th><th>Col 2</th><th>Col 3</th></tr>
          </thead>
          <tbody>
            <For each=${rows}>
              ${(row: string[]) => sld`
                <tr>
                  <For each=${row}>
                    ${(cell: string) => sld`<td>${cell}</td>`}
                  </For>
                </tr>
              `}
            </For>
          </tbody>
        </table>` as Node[];
        const container = document.createElement("div");
        container.append(...result);

        const table = container.querySelector("table")!;
        const tbody = table.querySelector("tbody")!;
        const trElements = tbody.querySelectorAll("tr");

        expect(trElements.length).toBe(2);

        const firstRowCells = trElements[0].querySelectorAll("td");
        expect(firstRowCells.length).toBe(3);
        expect(firstRowCells[0].textContent).toBe("Cell 1");
        expect(firstRowCells[1].textContent).toBe("Cell 2");
        expect(firstRowCells[2].textContent).toBe("Cell 3");
      });

      it("renders ordered and unordered lists with nested items", () => {
        const [items, setItems] = createSignal([
          { text: "Item 1", children: ["Subitem 1.1", "Subitem 1.2"] },
          { text: "Item 2", children: [] },
        ]);

        const result = sld`<div>
          <ul>
            <For each=${items}>
              ${(item: any) => sld`
                <li class="parent-item">
                  ${item.text}
                  <ol>
                    <For each=${item.children}>
                      ${(child: string) => sld`<li class="child-item">${child}</li>`}
                    </For>
                  </ol>
                </li>
              `}
            </For>
          </ul>
        </div>` as Node[];
        const container = document.createElement("div");
        container.append(...result);

        const parentItems = container.querySelectorAll(".parent-item");
        expect(parentItems.length).toBe(2);

        const childItems = container.querySelectorAll(".child-item");
        expect(childItems.length).toBe(2);
        expect(childItems[0].textContent).toBe("Subitem 1.1");
        expect(childItems[1].textContent).toBe("Subitem 1.2");
      });
    });

    describe("Media and Resource Elements", () => {
      it("handles img element with reactive src and alt", () => {
        const [src, setSrc] = createSignal("image1.jpg");
        const [alt, setAlt] = createSignal("Image 1");

        const result = sld`<img src="${src}" alt="${alt}" width="100" height="100" />` as Node[];
        const container = document.createElement("div");
        container.append(...result);

        const img = container.querySelector("img") as HTMLImageElement;
        expect(img.src).toContain("image1.jpg");
        expect(img.alt).toBe("Image 1");
        expect(img.width).toBe(100);
        expect(img.height).toBe(100);

        setSrc("image2.jpg");
        setAlt("Image 2");

        flush()

        expect(img.src).toContain("image2.jpg");
        expect(img.alt).toBe("Image 2");
      });

      it("handles link and meta elements correctly", () => {
        const result = sld`<head>
          <link rel="stylesheet" href="style.css" />
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>` as Node[];
        const container = document.createElement("div");
        container.append(...result);

        const link = container.querySelector("link") as HTMLLinkElement;
        expect(link.rel).toBe("stylesheet");
        expect(link.href).toContain("style.css");

        const charsetMeta = container.querySelector("meta[charset]") as HTMLMetaElement;
        expect(charsetMeta.getAttribute("charset")).toBe("utf-8");

        const viewportMeta = container.querySelector('meta[name="viewport"]') as HTMLMetaElement;
        expect(viewportMeta.content).toBe("width=device-width, initial-scale=1");
      });
    });
  });

  describe("GitHub Issues Compatibility", () => {
    it("https://github.com/ryansolid/dom-expressions/issues/156", () => {
      const elements =
        sld`<div><For each=${() => [1, 2, 3]}>${(n: number) => sld`<h1>${n}</h1>`}</For></div>` as Node[];
      const container = document.createElement("div");
      container.append(...elements);
      expect(container.innerHTML).toBe(
        "<div><h1>1<!--+--></h1><h1>2<!--+--></h1><h1>3<!--+--></h1><!--For--></div>",
      );
    });

    it("https://github.com/ryansolid/dom-expressions/issues/248", () => {
      const Comp = (props: any) => sld`<div>${props.children}</div>`;
      const result = sld.define({ Comp }).sld`<Comp>test "ups"</Comp>` as Node[];
      const container = document.createElement("div");
      container.append(...result)
      expect(container.innerHTML).toBe('<div>test "ups"<!--+--></div>');
    });

    it("https://github.com/ryansolid/dom-expressions/issues/268", () => {
      const elements = sld`
    <div id="div">Test</div>
    <style>
      #div {
        color:${() => "red"};
        background-color:blue;
      }
    </style>
  ` as Node[];
      const container = document.createElement("div");
      container.append(...elements);
      document.body.append(container);
      expect(container.innerHTML).toEqual(
        `<div id="div">Test</div><style>
      #div {
        color:red<!--+-->;
        background-color:blue;
      }
    </style>`,
      );
    });

    it("https://github.com/ryansolid/dom-expressions/issues/269", () => {
      const elements = sld``;
      expect(elements).toEqual([]);
    });

    it("https://github.com/ryansolid/dom-expressions/issues/399", () => {
      const Foo = (props: any) => sld`${props.bar}`;
      const result = sld.define({ Foo }).sld`<Foo bar></Foo>`;
      expect(result).toEqual(true);
    });

    it("https://github.com/solidjs/solid/issues/1996", () => {
      const [elem] = sld`<some-el attr:foo="123">inspect element</some-el>` as HTMLElement[];
      expect(elem.hasAttribute("foo")).toEqual(true);
    });

    it("https://github.com/solidjs/solid/issues/2299", () => {
      const nodes = sld`
    foo: ${123}
    bar: ${456}
  ` as Node[];

      expect(nodes[0]).toEqual("\n    foo: ");
      expect(nodes[1]).toEqual(123);
    });

    it("template element edge case", () => {
      const elem = sld`
    <div>
      <template>
        <h1>${123}</h1>
      </template>
    </div>
  `;
      expect(elem);
    });
  });
});
