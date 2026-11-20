/**
 * Build-time additions to llms.txt for the market-specific article sections
 * (/us/articles/, /uk/articles/). The hand-maintained public/llms.txt already
 * lists the original /articles/ section; this adds one block per sectioned
 * section that has articles, in the same "- [Title](url): summary" form, ahead
 * of the closing "## Contact" block.
 *
 * A URL the file already lists is not added again, and with nothing to add the
 * text comes back unchanged (byte for byte), so an empty section changes nothing.
 *
 * @param {string} llms the llms.txt text
 * @param {Array<{heading: string, entries: Array<{title: string, url: string, summary: string}>}>} sections
 */
export function addSectionArticles(llms, sections) {
  const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const blocks = sections
    .map((section) => {
      const lines = section.entries
        .filter((e) => !llms.includes(`](${e.url})`))
        .map((e) => `- [${e.title}](${e.url}): ${lowerFirst(e.summary)}`);
      return lines.length > 0 ? `## ${section.heading}\n\n${lines.join("\n")}\n\n` : "";
    })
    .filter(Boolean)
    .join("");
  if (!blocks) return llms;

  const contact = llms.search(/^## Contact$/m);
  if (contact !== -1) return llms.slice(0, contact) + blocks + llms.slice(contact);
  return `${llms.replace(/\n*$/, "")}\n\n${blocks.replace(/\n+$/, "\n")}`;
}
