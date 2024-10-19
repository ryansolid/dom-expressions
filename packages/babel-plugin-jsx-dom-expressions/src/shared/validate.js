// import parse5 from "parse5";
const parse5 = require("parse5");

/** `bodyElement` will be used as a `context` (The place where we run `innerHTML`) */
const bodyElement = parse5.parse(
  `<!DOCTYPE html><html><head></head><body></body></html>`
  // @ts-ignore
).childNodes[1].childNodes[1];

function innerHTML(htmlFragment) {
  /** `htmlFragment` will be parsed as if it was set to the `bodyElement`'s `innerHTML` property. */
  const parsedFragment = parse5.parseFragment(bodyElement, htmlFragment);

  /** `serialize` returns back a string from the parsed nodes */
  return parse5.serialize(parsedFragment);
}

/**
 * Returns an object with information when the markup is invalid
 *
 * @param {string} html - The html string to validate
 * @returns {{
 *   html: string; // html stripped of attributives and content
 *   browser: string; // what the browser returned from evaluating `html`
 * } | null}
 */
export function isInvalidMarkup(html) {
  html = html

    // normalize dom-expressions comments, so comments location are also validated
    .replaceAll("<!>", "<!---->")
    .replaceAll("<!$>", "<!--$-->")
    .replaceAll("<!/>", "<!--/-->")

    // replace text nodes
    // text nodes are problematic, think "doesn't" vs "doesn&#39;t"
    // we can detect if text nodes were moved by the browser when the `#text` moves

    // replace text nodes that isnt in between tags by `#text`
    .replace(/^[^<]+/, "#text")
    .replace(/[^>]+$/, "#text")
    // replace text nodes in between tags by `#text`
    .replace(/>[^<]+</gi, ">#text<")

    // remove attributes (the lack of quotes will make it mismatch)
    // attributes are not longer added to `templateWithClosingTags`
    // https://github.com/solidjs/solid/issues/2338
    // .replace(/<([a-z0-9-:]+)\s+[^>]+>/gi, "<$1>")

    // fix escaping, so doesnt mess up the validation
    // `&lt;script>a();&lt;/script>` -> `&lt;script&gt;a();&lt;/script&gt;`
    .replace(/&lt;([^>]+)>/gi, "&lt;$1&gt;")

    // edge cases (safe to assume they will use the partial in the right place)
    // fix tables rows
    .replace(/^<tr>/i, "<table><tbody><tr>")
    .replace(/<\/tr>$/i, "</tr></tbody></table>")
    // fix tables cells
    .replace(/^<td>/i, "<table><tbody><tr><td>")
    .replace(/<\/td>$/i, "</td></tr></tbody></table>")
    .replace(/^<th>/i, "<table><thead><tr><th>")
    .replace(/<\/th>$/i, "</th></tr></thead></table>")
    // fix table components
    .replace(/^<thead>/i, "<table><thead>")
    .replace(/<\/thead>$/i, "</thead></table>")
    .replace(/^<tbody>/i, "<table><tbody>")
    .replace(/<\/tbody>$/i, "</tbody></table>")
    .replace(/^<tfoot>/i, "<table><tfoot>")
    .replace(/<\/tfoot>$/i, "</tfoot></table>");

  // skip when equal to:
  switch (html) {
    // empty table components
    case "<table></table>":
    case "<table><thead></thead></table>":
    case "<table><tbody></tbody></table>":
    case "<table><thead></thead><tbody></tbody></table>": {
      return;
    }
  }

  /** Parse HTML. `browser` is a string with the supposed resulting html of a real `innerHTML` call */
  const browser = innerHTML(html);

  if (html !== browser) {
    return {
      html,
      browser
    };
  }
}
