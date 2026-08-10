interface MockNavigatorProps {
  readonly states: readonly {
    readonly questionId: string;
    readonly selectedChoice: number | null;
    readonly flagged: boolean;
  }[];
  readonly currentIndex: number;
  readonly onSelect: (index: number) => void;
}

export function MockNavigator({ states, currentIndex, onSelect }: MockNavigatorProps) {
  return (
    <aside className="mock-navigator panel" aria-label="Mock question navigator">
      <div className="panel-heading">
        <p className="section-kicker">Navigator</p>
        <h2>All 60 questions</h2>
      </div>
      <div className="navigator-legend" aria-label="Question status legend">
        <span>
          <i className="status-dot status-unanswered" /> Unanswered
        </span>
        <span>
          <i className="status-dot status-answered" /> Answered
        </span>
        <span>
          <i className="status-dot status-flagged" /> Flagged
        </span>
      </div>
      <div className="navigator-grid">
        {states.map((state, index) => {
          const status = state.flagged
            ? "flagged"
            : state.selectedChoice === null
              ? "unanswered"
              : "answered";
          return (
            <button
              type="button"
              key={state.questionId}
              className={`navigator-button navigator-${status} ${index === currentIndex ? "navigator-current" : ""}`}
              aria-label={`Question ${index + 1}: ${status}${index === currentIndex ? ", current" : ""}`}
              aria-current={index === currentIndex ? "step" : undefined}
              onClick={() => onSelect(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
