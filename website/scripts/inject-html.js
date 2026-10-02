/**
 * Splice rendered markup into the built HTML template. Function replacers, not
 * replacement strings: rendered text containing "$&", "$'" or "$$" would otherwise
 * be read as a replacement pattern and mangle the page.
 */
export function fillRoot(template, html) {
  return template.replace('<div id="root"></div>', () => `<div id="root">${html}</div>`);
}

export function appendToHead(template, headHtml) {
  return template.replace("</head>", () => `${headHtml}\n  </head>`);
}
