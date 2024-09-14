// fix me: jsdom crashes without this
const util = require("util");
const { TextEncoder, TextDecoder } = util;
Object.assign(global, { TextDecoder, TextEncoder });

const JSDOM = require("jsdom").JSDOM;
const Element = new JSDOM(`<!DOCTYPE html>`).window.document.body;

export function isInvalidMarkup(html) {
  let clean = html
    // remove comments
    .replace(/<![^>]*>/g, "")
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
  const result = Element.innerHTML
    // remove closing tags
    .replace(/<\/[^>]+>/g, "");

  // clean for compare
  clean = clean
    // remove closing tags
    .replace(/<\/[^>]+>/g, "");

  if (clean !== result) {
    return {
      html,
      clean,
      result
    };
  }
}
