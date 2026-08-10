import type { ExamQuestion } from "../../exam/model";
import { QuestionStimulus } from "../stimulus/QuestionStimulus";

interface MockQuestionProps {
  readonly question: ExamQuestion;
  readonly questionNumber: number;
  readonly selectedChoice: number | null;
  readonly reading: boolean;
  readonly onSelect: (choice: 0 | 1 | 2 | 3) => void;
}

export function MockQuestion({
  question,
  questionNumber,
  selectedChoice,
  reading,
  onSelect,
}: MockQuestionProps) {
  return (
    <article
      className="mock-question panel"
      aria-labelledby={`mock-question-${question.id}`}
    >
      <div className="mock-question-meta">
        <span>Question {questionNumber} of 60</span>
        <span>
          Chapter {question.chapter} · {question.topic}
        </span>
        {reading && <span className="phase-chip">Reading only</span>}
      </div>
      <QuestionStimulus stimulus={question.stimulus} />
      <h2 id={`mock-question-${question.id}`} className="mock-stem">
        {question.stem}
      </h2>
      <fieldset className="choice-list mock-choice-list">
        <legend>
          {reading ? "Choices are disabled during reading time." : "Choose one answer."}
        </legend>
        {question.choices.map((choice, index) => (
          <label
            className={`choice-option ${selectedChoice === index ? "choice-selected" : ""}`}
            key={`${question.id}-${index}`}
          >
            <input
              type="radio"
              name={`mock-choice-${question.id}`}
              checked={selectedChoice === index}
              disabled={reading}
              onChange={() => onSelect(index as 0 | 1 | 2 | 3)}
            />
            <span>
              <strong>{String.fromCharCode(65 + index)}.</strong> {choice}
            </span>
          </label>
        ))}
      </fieldset>
    </article>
  );
}
