// Normalization that remembers where every character came from in the ORIGINAL text.
// Curly quotes -> straight, en/em/minus dashes -> "-", non-breaking space -> space,
// and every run of whitespace (newlines included) collapses to one space. Case is kept.

const SINGLE_QUOTES = /[‘’‚‛′]/;
const DOUBLE_QUOTES = /[“”„‟″]/;
const DASHES = /[‐‑‒–—―−]/;
const WHITESPACE = /\s/; // \s includes   (non-breaking space) and newlines

export type Normalized = {
  /** The normalized string. */
  text: string;
  /** For every character of `text`, the [start, end) range it came from in the original. */
  map: { start: number; end: number }[];
};

export function normalizeWithMap(original: string): Normalized {
  let text = "";
  const map: { start: number; end: number }[] = [];
  let i = 0;
  while (i < original.length) {
    const ch = original[i];
    if (WHITESPACE.test(ch)) {
      let j = i;
      while (j < original.length && WHITESPACE.test(original[j])) j++;
      text += " ";
      map.push({ start: i, end: j });
      i = j;
      continue;
    }
    let out = ch;
    if (SINGLE_QUOTES.test(ch)) out = "'";
    else if (DOUBLE_QUOTES.test(ch)) out = '"';
    else if (DASHES.test(ch)) out = "-";
    text += out;
    map.push({ start: i, end: i + 1 });
    i++;
  }
  return { text, map };
}
