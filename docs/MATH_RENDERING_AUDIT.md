# Math rendering audit

This is the correction audit for PR #11, based on the pre-math content commit
`1d02fcb61fa8c883b05ca52072a5f96beebfa07f`. The audit is presentation-only:
question answers, economic claims, card/question mappings, scheduler evidence,
and grading rules were compared with that base and were not intentionally
changed.

## Content conventions

- Free-form learner-facing prose uses only explicit `\(...\)` inline and
  `\[...\]` display delimiters. `$...$` and `$$...$$` are not inferred because
  ordinary currency values are legitimate course content.
- `KnowledgeEquation.expression` and
  `KnowledgeEquationVariable.symbol` are raw LaTeX without delimiters.
  Expressions render as display math and symbols render as inline math.
- Word-valued structured symbols are explicit text, for example
  `\text{debt stock}` and `\text{nominal GDP}`. Conventional abbreviations use
  an appropriate roman form such as `\mathrm{GDP}`. One-letter and genuinely
  symbolic fields remain ordinary raw LaTeX such as `x`, `\pi`, or `P_{t-1}`.
- Ordinary prose, acronyms, currency, units, and native SVG labels remain
  prose/text unless they function as mathematical notation.

## Rendering architecture

- `src/math/markup.ts` tokenizes the two explicit delimiter pairs and renders
  KaTeX with `output: "htmlAndMathml"`, `throwOnError: true`, `strict: "error"`,
  and `trust: false`.
- `src/components/math/MathText.tsx` renders mixed prose and inline/display
  math. `src/components/math/MathExpression.tsx` renders structured raw-LaTeX
  fields and has a local fallback for malformed runtime payloads.
- `src/components/knowledge/KnowledgeText.tsx` tokenizes before matching
  terms. The knowledge matcher receives prose fragments only, never a math
  fragment. Missing `KnowledgeContext` and `disclosure="disabled"` therefore
  affect concept links only; they do not disable math rendering.
- Authored static content is migrated explicitly. The former broad
  `normalizeLegacyMathText` runtime normalizer was removed. Generated content
  uses narrow template helpers for interpolated math and is validated at
  generation time rather than repaired by generic prose regexes.
- KaTeX and its CSS are bundled locally through npm; there is no CDN or runtime
  network dependency. Display equations confine horizontal overflow to the
  equation container on narrow screens.

## Registries and surfaces audited

The audit inspected all 352 canonical cards and synchronized JSON, TSV, and
readable Markdown exports; 107 authored exam questions; 30 stimulus questions;
the 168-question runtime exam bank; all 300 Knowledge concepts; all 28 Guided
Knowledge Check skills; all 26 generated-calculation templates; table stimuli;
and native SVG graph text.

The audited learner-facing surfaces are Study cards (including MCQ choices),
Practice, Mock stems and choices, Mock results, Guided prompts/choices/
explanations, generated-calculation prompts/worked solutions/explanations/
common traps, Knowledge articles and foundation/landing summaries, structured
Knowledge equations and variables, tables, and graph labels.

Native SVG labels were deliberately not routed through KaTeX or `foreignObject`.
Short source-faithful labels such as `w_f`, `L_D`, `L_S`, `π0`, `π1`, `Y`, and
`r` remain native SVG text so their course semantics are preserved. They are
audited for leaked LaTeX commands and Unicode script markup separately.

## Conversion and validation counts

The current static validator reports:

- 7,685 learner-facing content-string visits inspected;
- 1,924 explicit free-prose math fragments validated;
- 62 structured equation expressions validated;
- 170 structured variable symbols validated;
- 284 native SVG graph-label strings audited;
- 16 deterministic generated Guided variants sampled by the math audit;
- 208 deterministic generated calculation instances sampled by the math audit.

The broader existing generators’ validators apply the same math checks to 1,000
generated Guided variants and 13,000 generated calculation instances (26
templates × 500 seeds).

Compared with the pre-math base, the synchronized content conversion changed:

- 240 canonical-card learner-facing text fields across 159 cards, 235 of which
  contain explicit mathematical notation changes;
- 80 authored exam-bank learner-facing fields;
- 30 stimulus-registry strings, including graph-label source cleanup;
- 62 Knowledge equation expressions;
- 102 Knowledge variable-symbol fields;
- 11 Knowledge prose/example/interpretation fields.

The inventories remain unchanged: 352 cards, 168 exam questions, 300 Knowledge
concepts, and 28 Guided checks. No unexplained raw pseudo-LaTeX fragments remain
in learner-facing prose or structured fields. The expected and observed count
is zero. The only deliberate non-KaTeX mathematical labels are the 284 audited
native SVG text strings; they are not free-form prose formulas and are kept
native to preserve graph layout and source notation.

## Corrected review regressions

- `auth-ch07-012` now keeps “gives” in prose:

  ```text
  At the lower bound the nominal rate is 0%. With expected inflation of -2%,
  the Fisher relation \(r \approx i-\pi^e\) gives
  \(r \approx 0\%-(-2\%)=+2\%\).
  ```

  The validator rejects the former syntactically valid fragment containing
  `gives` inside math.

- `ch07-016` retains `(for given inflation expectations)` in the monetary-
  transmission chain.
- Disposable income consistently uses source-faithful `Y^D`, including
  `ch04-008`, `ch04-009`, Knowledge equations, exam content, and generated
  content. Unrelated genuine subscripts are not globally rewritten.
- Legacy `C/I` sequence shorthand is rendered as `C\text{ and }I`, not as a
  quotient. The `ch08-031` relationship is fully typeset rather than partially
  delimited.
- `ch06-009` retains the public-currency and usable-deposit definitions with no
  duplicate punctuation. `ch06-028` retains its original grammatical common
  trap without an injected identity clarification.
- Definitions and teaching prose for labour force, household saving, public
  saving, net investment, money stock, wealth, budget variables, and related
  symbols were restored where an earlier normalization had shortened them.
- Knowledge variable labels such as `debt stock`, `nominal GDP`, `revenue`,
  `spending`, `current account`, `assets`, `liabilities`, and `equity` are
  explicit `\text{...}` labels; abbreviations such as GDP, MPL, LF, and NX use
  `\mathrm{...}` where appropriate.
- Wage-floor graph labels remain `w_f`, `L_D`, and `L_S`; no bar or supplied
  Unicode superscript was invented as a substitute for the source notation.

## Validator safeguards and regressions

`npm run validate:math-content` validates balanced and non-empty delimiters,
KaTeX syntax, semantic prose-in-math checks, raw pseudo-LaTeX and ASCII
fractions outside delimiters, broken operators crossing math boundaries,
structured word-valued symbols, authored registries, graph text, and generated
samples. It also asserts the reviewed regressions above.

The regression suite proves that a syntactically valid but semantically bad
fragment such as:

```text
\(r\approx i-\pi^e gives r\approx2\%\)
```

fails validation, while the split prose/math form passes. It also rejects
`1/(1-c)` outside delimiters, `\(\delta=30\)/500`, and
`\(\pi\)≈\(g_M-g_Y\)`. Structured `debt stock` is rejected unless explicitly
written as `\text{debt stock}`.

`MathExpression` retains KaTeX’s MathML output and does not put a parent
`aria-label` over it. DOM regression coverage confirms that both `.katex` HTML
and descendant MathML/annotation output are present. Only the malformed-formula
fallback uses a lossy error label, and it is never reached by committed static
content after validation.

## Representative UI coverage

`src/test/mathRendering.test.tsx` covers plain prose, multiple inline formulas,
display math, punctuation, subscripts, superscripts, Greek commands, fractions,
runtime fallback, semantic validation failure, prose-only Knowledge matching,
disabled disclosure, absent context, `ch01-019`, a long Cobb-Douglas/debt-style
formula, MCQ choices, Mock mode without new Knowledge lookup, Knowledge equation
rendering, generated calculations, Guided choices, graph-label semantics, and
KaTeX accessibility.

`ch01-019` before conversion used the ordinary string:

```text
π_t = (P_t - P_{t-1}) / P_{t-1}, usually expressed as a percentage.
```

It now uses:

```text
\(\pi_t = \frac{P_t-P_{t-1}}{P_{t-1}}\), usually expressed as a percentage.
```

The UI regression confirms that the card contains KaTeX HTML/MathML and does
not expose literal `_t` or `{t-1}` markup.

Every changed learner-facing field was re-audited against the pre-math base for
semantic preservation. The resulting substantive economic-change count is
zero. The explicit punctuation/grammar repairs listed above are content-
integrity corrections; no economic claim was silently changed. Mathematical
cleanup does not remove or alter economic definitions, assumptions,
qualifications, correct answers, or variable meanings.
