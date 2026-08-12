# Math rendering audit

This audit covers the math-rendering cleanup on the PR #10 head
`1d02fcb61fa8c883b05ca52072a5f96beebfa07f`.

## Content conventions

- Free-form prose uses only `\(...\)` for inline math and `\[...\]` for display math.
  Dollar delimiters are deliberately not supported because course content contains
  ordinary currency values.
- `KnowledgeEquation.expression` and
  `KnowledgeEquationVariable.symbol` are raw LaTeX without delimiters. Expressions
  render as display math; variable symbols render as inline math.
- Ordinary prose, acronyms, currency, units, and graph-native labels remain prose or
  native text unless they are functioning as an equation, relationship, ratio, or
  mathematical variable.

## Rendering architecture

- `src/math/markup.ts` tokenizes the two explicit delimiter pairs and validates or
  renders KaTeX with `htmlAndMathml`, `throwOnError`, and `trust: false`.
- `src/components/math/MathText.tsx` renders mixed prose and inline/display math.
- `src/components/math/MathExpression.tsx` renders structured raw-LaTeX fields and
  provides a local runtime fallback for malformed formulas.
- `src/components/knowledge/KnowledgeText.tsx` tokenizes before matching terms. The
  knowledge matcher receives prose tokens only; it never receives a math token.
  Missing `KnowledgeContext` and `disclosure="disabled"` therefore affect concept
  links only and do not disable math rendering.
- KaTeX CSS is imported locally from `katex/dist/katex.min.css`. Display formulas
  constrain horizontal overflow to the formula container for narrow screens.

## Registries and surfaces audited

The audit inspected the 352-card canonical deck and synchronized JSON, TSV, and
readable Markdown exports; both authored exam registries; the runtime exam bank;
the 300-concept Knowledge registry; 28 Guided Knowledge Check skills; all 26
calculation templates; table stimuli; graph text; Study, Practice, Mock, Mock
results, Guided, Knowledge, and generated-calculation surfaces.

Canonical card fields audited were `front`, `answer`, `explanation`, `commonTrap`,
and `choices`. Exam stems, choices, explanations, choice rationales, and stimulus
text were audited. Knowledge prose fields, structured equations, variable symbols,
and equation interpretations were audited. Foundation and landing summaries were
updated to use the same math-only renderer. SVG graph labels remain native SVG text;
short symbols such as `π`, `Y`, `r`, `Y*`, `M/P`, and `π = 4%` are intentionally
kept as Unicode/plain labels rather than rendered through `foreignObject`.
Legacy canonical-MCQ rationales are normalized at the exam-bank boundary before
they reach Practice or Mock results, so those authored explanations use the same
delimiter and KaTeX validation path.

## Conversion and validation counts

The static validator reports:

- 7,083 inspected content-string visits;
- 1,133 valid explicit free-prose math fragments;
- 232 validated structured raw-LaTeX fields;
- 284 audited native SVG graph-label strings;
- 12 deterministic generated Guided variants sampled;
- 130 deterministic generated calculation instances sampled (26 templates × 5
  seeds).

Relative to the reviewed base commit, the migration changed:

- 263 canonical-card content strings across 159 cards;
- 150 authored exam-bank strings;
- 37 authored stimulus-question strings;
- 108 structured Knowledge equation or variable fields;
- 7 Knowledge prose strings.

The migration did not change inventory or metadata counts. The remaining deliberate
plain mathematical notation is confined to native SVG graph labels and their
accessible descriptions, plus ordinary quote/unit text such as `USD/AUD`. There
are no unexplained raw pseudo-LaTeX fragments in learner-facing prose; the validator
expects zero.

## Regression coverage

`src/test/mathRendering.test.tsx` covers plain prose, inline and display formulas,
multiple fragments, punctuation, subscripts, superscripts, Greek commands,
fractions, malformed runtime fallback, malformed validation failure, prose-only
knowledge matching, disabled disclosure, absent context, the canonical `ch01-019`
card, a Cobb-Douglas/output-per-worker formula, an MCQ choice, Mock mode, a
structured Knowledge equation, a generated calculation, and a Guided check.

The content validator is run by `npm run validate:math-content`, by `prebuild`, and
by CI. It validates balanced/non-empty delimiters, KaTeX syntax, structured raw
LaTeX, authored registries, deterministic generated samples, and common raw
pseudo-LaTeX leaks outside math delimiters.

For `ch01-019`, the old ordinary string was:

```text
π_t = (P_t - P_{t-1}) / P_{t-1}, usually expressed as a percentage.
```

It is now:

```text
\(\pi_t = \frac{P_t-P_{t-1}}{P_{t-1}}\), usually expressed as a percentage.
```

The mathematical cleanup changes notation and presentation only. No answer,
economic claim, numerical value, card/question mapping, scheduler evidence, or
grading rule was intentionally changed.
