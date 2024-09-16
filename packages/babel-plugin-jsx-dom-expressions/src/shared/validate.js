// fix me: jsdom crashes without this
const util = require("util");
const { TextEncoder, TextDecoder } = util;
Object.assign(global, { TextDecoder, TextEncoder });

const JSDOM = require("jsdom").JSDOM;
const Element = new JSDOM(`<!DOCTYPE html>`).window.document.body;

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
    .replace(/<([a-z0-9-]+)\s+[^>]+>/gi, "<$1>")

    // fix escaping, so doesnt mess up the validation
    // `&lt;script>a();&lt;/script>` -> `&lt;script&gt;a();&lt;/script&gt;`
    .replace(/&lt;([^>]+)>/gi, "&lt;$1&gt;")

    // edge cases (safe to assume they will use the partial in the right place)
    // fix tables rows
    .replace(/^<tr>/i, "<table><tbody><tr>")
    .replace(/<\/tr>$/i, "</tr></tbody></table>")
    // fix tables cells
    .replace(/^<td>/i, "<table><tbody><tr><td>")
    .replace(/<\/td>$/i, "</td></tr></tbody></table>");

  // parse
  Element.innerHTML = html;
  // result
  const browser = Element.innerHTML;

  if (html !== browser) {
    return {
      html,
      browser
    };
  }
}
