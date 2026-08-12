import { accessibleMathLabel, renderMathToHtml } from "../../math/markup";

export function MathExpression({
  expression,
  displayMode = false,
}: {
  readonly expression: string;
  readonly displayMode?: boolean;
}) {
  const html = renderMathToHtml(expression, displayMode);
  if (html === null) {
    return (
      <span
        className="math-expression math-expression-fallback"
        role="img"
        aria-label="Mathematical expression could not be typeset"
      >
        {expression}
      </span>
    );
  }

  return (
    <span
      className={`math-expression ${displayMode ? "math-display" : "math-inline"}`}
      aria-label={`Mathematical expression: ${accessibleMathLabel(expression)}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
