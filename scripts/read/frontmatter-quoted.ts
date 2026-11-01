const backslash = '\\';
const escapeWidths: Readonly<Record<string, number>> = { x: 2, u: 4, U: 8 };
const escapes: Readonly<Record<string, string>> = {
  '0': '\0', a: '\x07', b: '\b', t: '\t', n: '\n', v: '\v', f: '\f', r: '\r',
  e: '\x1b', ' ': ' ', '"': '"', '/': '/', [backslash]: backslash, N: '\u0085',
  _: '\u00a0', L: '\u2028', P: '\u2029',
};

/** Decode YAML quoted scalars without taking on nested YAML or a runtime parser. */
export function quotedScalar(raw: string): { value: string; length: number } {
  const quote = raw[0];
  let value = '';
  for (let index = 1; index < raw.length; index += 1) {
    const character = raw[index] ?? '';
    if (character === quote) {
      if (quote === "'" && raw[index + 1] === "'") { value += "'"; index += 1; continue; }
      return { value, length: index + 1 };
    }
    if (quote === '"' && character === backslash) {
      const escape = raw[++index] ?? '';
      const width = escapeWidths[escape];
      if (width) {
        const digits = raw.slice(index + 1, index + 1 + width);
        if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(digits)) throw new Error('invalid quoted escape');
        const code = Number.parseInt(digits, 16);
        if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) throw new Error('invalid quoted escape');
        value += String.fromCodePoint(code); index += width;
      } else {
        if (!Object.hasOwn(escapes, escape)) throw new Error('invalid quoted escape');
        value += escapes[escape];
      }
    } else value += character;
  }
  throw new Error('unclosed quoted scalar');
}
