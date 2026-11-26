// Frontmatter is typed with straight quotes. Markdown bodies get curly ones from
// the build, so a title or lead set in display type looks unfinished beside
// them unless it is curled too.

/** "You've" -> “You’ve”. Leaves text that already has curly quotes alone. */
export function curlQuotes(text: string): string {
  return (
    text
      .replace(/"([^"]*)"/g, '\u201c$1\u201d')
      // '90s: an apostrophe standing for dropped digits, not an opening quote.
      .replace(/'(?=\d)/g, '\u2019')
      // After a letter, digit or closing punctuation: an apostrophe (it's,
      // r\u00e9sum\u00e9's, dogs') or the end of a quoted phrase ('Hello.').
      .replace(/([\p{L}\p{N}.,!?\u2026])'/gu, '$1\u2019')
      // What is left before a letter opens a quoted phrase.
      .replace(/'(?=\p{L})/gu, '\u2018')
  );
}
