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

/**
 * Supplies a readable fallback name for controls that contain KaTeX. The
 * MathML remains in the DOM for assistive technology; this label also keeps
 * browsers/test environments that cannot inspect MathML from exposing raw
 * LaTeX source as a control name.
 */
export function accessibleMathLabel(expression: string): string {
  const greek: Record<string, string> = {
    alpha: "α",
    beta: "β",
    delta: "δ",
    gamma: "γ",
    lambda: "λ",
    mu: "μ",
    pi: "π",
    rho: "ρ",
    sigma: "σ",
    varepsilon: "ε",
  };
  return expression
    .replace(/\\text\s*\{([^{}]*)\}/gu, "$1")
    .replace(/_(?:\{([^{}]*)\}|([A-Za-z0-9-]+))/gu, " subscript $1$2 ")
    .replace(/\^(?:\{([^{}]*)\}|([A-Za-z0-9-]+))/gu, " superscript $1$2 ")
    .replace(/\\frac\b/gu, " fraction ")
    .replace(/\\(?:times|cdot)\b/gu, " times ")
    .replace(/\\approx\b/gu, " approximately ")
    .replace(/\\(?:le|leq)\b/gu, " less than or equal to ")
    .replace(/\\(?:ge|geq)\b/gu, " greater than or equal to ")
    .replace(
      /\\(alpha|beta|delta|gamma|lambda|mu|pi|rho|sigma|varepsilon)\b/gu,
      (_, name: string) => greek[name] ?? name,
    )
    .replace(/[{}\\]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
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
