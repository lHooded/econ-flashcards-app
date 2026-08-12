import { renderToString } from "katex";

export type MathTextToken =
  | { readonly kind: "prose"; readonly value: string }
  | {
      readonly kind: "math";
      readonly displayMode: boolean;
      readonly value: string;
    };

export class MathMarkupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MathMarkupError";
  }
}

const DELIMITERS = [
  { opening: "\\(", closing: "\\)", displayMode: false },
  { opening: "\\[", closing: "\\]", displayMode: true },
] as const;

/**
 * Free-form content uses only explicit \(...\) and \[...\] delimiters. In
 * particular, this parser intentionally does not infer math from dollar signs
 * or from LaTeX-looking prose.
 */
export function tokenizeMathText(text: string): readonly MathTextToken[] {
  const tokens: MathTextToken[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const next = findNextOpeningDelimiter(text, cursor);
    if (next === null) {
      pushProse(tokens, text.slice(cursor), cursor);
      break;
    }

    pushProse(tokens, text.slice(cursor, next.index), cursor);
    const closingIndex = text.indexOf(next.delimiter.closing, next.index + 2);
    if (closingIndex < 0) {
      throw new MathMarkupError(
        `Unclosed ${next.delimiter.displayMode ? "display" : "inline"} math delimiter at character ${next.index}.`,
      );
    }

    const value = text.slice(next.index + 2, closingIndex).trim();
    if (value.length === 0) {
      throw new MathMarkupError(
        `Empty ${next.delimiter.displayMode ? "display" : "inline"} math fragment at character ${next.index}.`,
      );
    }
    tokens.push({
      kind: "math",
      displayMode: next.delimiter.displayMode,
      value,
    });
    cursor = closingIndex + 2;
  }

  if (cursor === text.length && text.length === 0) {
    return [];
  }
  return tokens;
}

export function renderMathToHtml(
  expression: string,
  displayMode: boolean,
): string | null {
  try {
    return renderToString(expression, {
      displayMode,
      output: "htmlAndMathml",
      strict: "error",
      throwOnError: true,
      trust: false,
    });
  } catch {
    return null;
  }
}

const ALLOWED_BARE_MATH_IDENTIFIERS = new Set([
  "AD",
  "AE",
  "APC",
  "AK",
  "AUD",
  "BB",
  "BOP",
  "CA",
  "CPI",
  "EUR",
  "GDP",
  "INT",
  "KFA",
  "LF",
  "LOOP",
  "MD",
  "MV",
  "MPC",
  "MPI",
  "MPL",
  "MPK",
  "MTR",
  "NS",
  "NX",
  "PAE",
  "PBB",
  "PV",
  "PY",
  "PRF",
  "RBA",
  "TA",
  "TFP",
  "TR",
  "UC",
  "USD",
  "VMPK",
  "VMPL",
  "RE",
  "pbb",
  "uc",
  "exp",
  "log",
  "ln",
  "max",
  "min",
  "sin",
  "cos",
  "tan",
]);

/**
 * KaTeX can parse ordinary English as a sequence of italic variables. Static
 * validation therefore applies a small semantic guard after syntax parsing:
 * prose words must be placed in \text{}, \mathrm{}, or \operatorname{} (or
 * written outside the math fragment). Conventional course abbreviations are
 * explicitly allow-listed rather than inferred from arbitrary prose.
 */
export function validateMathExpressionSemantics(
  expression: string,
  path: string,
): void {
  const stripped = stripTextCommandBodies(expression);
  const identifiers = stripped.match(/[A-Za-z]{2,}/gu) ?? [];
  const suspicious = identifiers.filter(
    (identifier) => !ALLOWED_BARE_MATH_IDENTIFIERS.has(identifier),
  );
  if (suspicious.length > 0) {
    const allowedCompoundIdentifiers = suspicious.filter((identifier) =>
      /^[a-z]+[A-Z][A-Za-z]*$/u.test(identifier),
    );
    const remaining = suspicious.filter(
      (identifier) => !allowedCompoundIdentifiers.includes(identifier),
    );
    if (remaining.length === 0) return;
    throw new MathMarkupError(
      path +
        " contains ordinary prose inside math: " +
        [...new Set(remaining)].join(", ") +
        ". Put explanatory words in \\text{...} or outside the math fragment.",
    );
  }
}

function stripTextCommandBodies(expression: string): string {
  const textCommands = new Set(["text", "mathrm", "operatorname"]);
  let result = "";
  let cursor = 0;
  while (cursor < expression.length) {
    if (expression[cursor] !== "\\") {
      result += expression[cursor];
      cursor += 1;
      continue;
    }

    let commandEnd = cursor + 1;
    while (
      commandEnd < expression.length &&
      /[A-Za-z]/u.test(expression[commandEnd]!)
    ) {
      commandEnd += 1;
    }
    const command = expression.slice(cursor + 1, commandEnd);
    if (!textCommands.has(command)) {
      result += " ";
      cursor = commandEnd;
      continue;
    }

    let bodyStart = commandEnd;
    while (bodyStart < expression.length && /\s/u.test(expression[bodyStart]!)) {
      bodyStart += 1;
    }
    if (expression[bodyStart] !== "{") {
      result += " ";
      cursor = bodyStart;
      continue;
    }
    const bodyEnd = findMatchingBrace(expression, bodyStart);
    if (bodyEnd === -1) {
      result += " ";
      cursor = bodyStart + 1;
      continue;
    }
    result += " ";
    cursor = bodyEnd + 1;
  }
  return result;
}

function findMatchingBrace(value: string, openingIndex: number): number {
  let depth = 0;
  for (let index = openingIndex; index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    if (value[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

export function validateMathExpression(expression: string, path: string): void {
  if (expression.trim().length === 0) {
    throw new MathMarkupError(`${path} contains an empty math expression.`);
  }

  try {
    renderToString(expression, {
      displayMode: true,
      output: "htmlAndMathml",
      strict: "error",
      throwOnError: true,
      trust: false,
    });
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new MathMarkupError(`${path} is not valid KaTeX: ${reason}`);
  }
  validateMathExpressionSemantics(expression, path);
}

export function validateMathText(text: string, path: string): number {
  let tokens: readonly MathTextToken[];
  try {
    tokens = tokenizeMathText(text);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new MathMarkupError(`${path}: ${reason}`);
  }

  let fragments = 0;
  for (const [index, token] of tokens.entries()) {
    if (token.kind !== "math") continue;
    fragments += 1;
    validateMathExpression(token.value, `${path} math fragment ${index + 1}`);
  }
  return fragments;
}

function findNextOpeningDelimiter(
  text: string,
  start: number,
): { readonly index: number; readonly delimiter: (typeof DELIMITERS)[number] } | null {
  let best: { index: number; delimiter: (typeof DELIMITERS)[number] } | null = null;
  for (const delimiter of DELIMITERS) {
    const index = text.indexOf(delimiter.opening, start);
    if (index < 0 || (best !== null && index >= best.index)) continue;
    best = { index, delimiter };
  }
  return best;
}

function pushProse(tokens: MathTextToken[], value: string, offset: number): void {
  const strayClosing = value.search(/\\\)|\\\]/u);
  if (strayClosing >= 0) {
    throw new MathMarkupError(
      "Unmatched closing math delimiter at character " + (offset + strayClosing) + ".",
    );
  }
  if (value.length > 0) tokens.push({ kind: "prose", value });
}
