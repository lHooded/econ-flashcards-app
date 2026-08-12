import type { ReactNode } from "react";
import { MathExpression } from "./MathExpression";
import { tokenizeMathText } from "../../math/markup";

export function MathText({
  text,
  renderProse,
}: {
  readonly text: string;
  readonly renderProse?: (value: string, tokenIndex: number) => ReactNode;
}) {
  try {
    const tokens = tokenizeMathText(text);
    return (
      <>
        {tokens.map((token, index) =>
          token.kind === "math" ? (
            <MathExpression
              key={`math-${index}`}
              expression={token.value}
              displayMode={token.displayMode}
            />
          ) : (
            <span key={`prose-${index}`} className="math-prose">
              {renderProse === undefined
                ? token.value
                : renderProse(token.value, index)}
            </span>
          ),
        )}
      </>
    );
  } catch {
    // Static content is rejected by validate:math-content. This branch keeps a
    // stale/corrupt runtime payload from taking down the learning surface.
    return <span className="math-text-fallback">{text}</span>;
  }
}
