import {
  MathMarkupError,
  tokenizeMathText,
  validateMathExpression,
  validateMathText,
} from "./markup";

const RAW_PSEUDO_MATH_PATTERNS: readonly RegExp[] = [
  /\\(?:frac|tilde|hat|bar|sqrt|pi|alpha|beta|gamma|delta|lambda|mu|sigma|rho|Delta|times|approx|le|ge)\b/u,
  /\b[A-Za-z][A-Za-z0-9]*_\{[^}]+\}/u,
  /\b[A-Za-z][A-Za-z0-9]*\^[A-Za-z0-9{]/u,
  /[₀₁₂₃₄₅₆₇₈₉₋₊ₐₑₒₓₙₚₛₜₕᵃᵅᵝᵀᴮᴷᴰᴸᵈᵉ]/u,
  /(?:[πΔαβγδλμσρΩ]\s*(?:=|≈|≤|≥|×|÷)|(?:=|≈|≤|≥|×|÷)\s*[πΔαβγδλμσρΩ])/u,
];

const RAW_ASCII_FRACTION_PATTERN =
  /(?<![A-Za-z0-9_/])(?:\d+(?:\.\d+)?|[A-Za-z]{1,4})\s*\/\s*(?:\([^()\n]+\)|\d+(?:\.\d+)?|[A-Za-z]{1,4})(?![A-Za-z0-9_/])/gu;
const RAW_PARENTHESED_FRACTION_PATTERN =
  /(?<![A-Za-z0-9_/])(?:\d+(?:\.\d+)?|[A-Za-z]{1,4})\s*\/\s*\([^.\n]{1,100}\)/u;
const DELIBERATE_NATIVE_RATIOS = new Set([
  "USD/AUD",
  "AUD/USD",
  "EUR/AUD",
  "EUR/USD",
  "USD/EUR",
  "and/or",
]);

/**
 * Finds notation that looks mathematical but is outside an explicit
 * free-prose math fragment. The caller should pass prose tokens only; this
 * keeps valid KaTeX expressions out of the legacy-syntax check.
 */
export function findRawPseudoMath(prose: string): readonly string[] {
  const matches: string[] = [];
  for (const pattern of RAW_PSEUDO_MATH_PATTERNS) {
    const match = pattern.exec(prose);
    if (match !== null) matches.push(match[0].trim());
  }

  for (const match of prose.match(RAW_ASCII_FRACTION_PATTERN) ?? []) {
    const compact = match.replace(/\s+/gu, "");
    const [numerator, denominator] = compact.split("/");
    const isPlainWordPhrase =
      numerator !== undefined &&
      denominator !== undefined &&
      (/^[a-z]{2,}$/u.test(numerator) || /^[a-z]{2,}$/u.test(denominator));
    if (!DELIBERATE_NATIVE_RATIOS.has(compact) && !isPlainWordPhrase) {
      matches.push(match.trim());
    }
  }

  const parenthesized = prose.match(RAW_PARENTHESED_FRACTION_PATTERN);
  if (parenthesized !== null) {
    const compact = parenthesized[0].replace(/\s+/gu, "");
    const [numerator, denominator] = compact.split("/");
    const isPlainWordPhrase =
      numerator !== undefined &&
      denominator !== undefined &&
      (/^[a-z]{2,}$/u.test(numerator) || /^[a-z]{2,}$/u.test(denominator));
    if (!DELIBERATE_NATIVE_RATIOS.has(compact) && !isPlainWordPhrase) {
      matches.push(parenthesized[0].trim());
    }
  }

  return matches;
}

export function findBrokenMathFragmentBoundary(value: string): string | null {
  const patterns: readonly [RegExp, string][] = [
    [
      /\\\)\s*(?:\/|[+−×÷≈≤≥])\s*(?:\\\(|[A-Za-z0-9πΔαβγδλμσρΩ])/u,
      "an operator continues outside a closed math fragment",
    ],
    [
      /(?<![A-Za-z0-9])[A-Za-z0-9πΔαβγδλμσρΩ)]\s*[-+−×÷≈≤≥/]\s*\\\(/u,
      "an operator begins immediately before a new math fragment",
    ],
  ];
  for (const [pattern, message] of patterns) {
    if (pattern.test(value)) return message;
  }
  return null;
}

/**
 * Validates a free-form learner-facing string, including both KaTeX syntax
 * and the audit's semantic/pseudo-math guards.
 */
export function validateFreeMathContent(value: string, path: string): number {
  const mathFragments = validateMathText(value, path);
  const prose = tokenizeMathText(value)
    .filter((token) => token.kind === "prose")
    .map((token) => token.value)
    .join(" ");
  const rawMatches = findRawPseudoMath(prose);
  if (rawMatches.length > 0) {
    throw new MathMarkupError(
      path +
        " contains LaTeX-like notation outside explicit math delimiters: " +
        [...new Set(rawMatches)].join(", "),
    );
  }
  const boundaryIssue = findBrokenMathFragmentBoundary(value);
  if (boundaryIssue !== null) {
    throw new MathMarkupError(
      path + " has a broken math fragment boundary: " + boundaryIssue,
    );
  }
  return mathFragments;
}

/**
 * Structured KnowledgeEquation variables use raw LaTeX, but a descriptive
 * multi-word label must be explicitly text-wrapped so KaTeX does not render
 * it as a product of italic variables.
 */
export function validateStructuredVariableSymbol(value: string, path: string): void {
  const trimmed = value.trim();
  if (
    /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/u.test(trimmed) ||
    /^[A-Za-z]{2,}$/u.test(trimmed)
  ) {
    throw new MathMarkupError(
      path +
        " is a bare word-valued symbol. Use raw LaTeX such as \\text{debt stock} or \\mathrm{GDP}.",
    );
  }
  validateMathExpression(value, path);
}
