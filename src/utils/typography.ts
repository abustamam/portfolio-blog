// Frontmatter is typed with straight quotes. Markdown bodies get curly ones from
// the build, so a title or lead set in display type looks unfinished beside
// them unless it is curled too.

/** "You've" -> “You’ve”. Leaves text that already has curly quotes alone. */
export function curlQuotes(text: string): string {
  return text
    .replace(/"([^"]*)"/g, '\u201c$1\u201d')
    .replace(/(\w)'(\w)/g, '$1\u2019$2')
    .replace(/(\w)'/g, '$1\u2019')
    .replace(/'(\w)/g, '\u2018$1');
}
