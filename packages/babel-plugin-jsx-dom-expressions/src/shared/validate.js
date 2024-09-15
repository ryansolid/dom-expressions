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
 *   clean: string; // html stripped of comments, atrributes and content
 *   browser: string; // what the browser returned from evaluating `clean`
 * } | null}
 */
export function isInvalidMarkup(html) {
  let clean = html
    // remove comments
    // .replace(/<![^>]*>/g, "")

    // normalize dom-expressions comments, so comments location are also validate
    .replaceAll("<!>", "<!---->")
    .replaceAll("<!$>", "<!--$-->")
    .replaceAll("<!/>", "<!--/-->")
    // remove content
    // content could turn out problematic, think `á` vs `&aacute;`
    .replace(/>([^<]+)</gi, "><")
    // remove attributes
    .replace(/<([a-z0-9-]+)\s+[^>]+>/gi, "<$1>")
    // fix escaping, so doesnt mess up the validation
    // `&lt;script>a();&lt;/script>` -> `&lt;script&gt;a();&lt;/script&gt;`
    .replace(/&lt;([^>]+)>/gi, "&lt;$1&gt;");

  // parse
  Element.innerHTML = clean;

  // clean for compare
  const browser = Element.innerHTML
    // remove closing tags
    .replace(/<\/[^>]+>/g, "");

  // clean for compare
  clean = clean
    // remove closing tags
    .replace(/<\/[^>]+>/g, "");

  if (clean !== browser) {
    return {
      clean,
      browser
    };
  }
}
