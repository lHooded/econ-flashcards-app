import type { ExamEvidenceSource } from "./model";

/**
 * Static source metadata. Weights express evidence quality and current-format
 * fit; they are not calibrated probabilities and are never shown as scores.
 */
export const examEvidenceSources: readonly ExamEvidenceSource[] = Object.freeze([
  {
    id: "current-exam-details",
    year: 2026,
    kind: "current-course",
    authenticityWeight: 1,
    formatFitWeight: 1,
    notes:
      "Bundled exam_details.txt: current 60-MCQ, 110-minute exam and comprehensive Chapters 1–10 scope.",
  },
  {
    id: "current-course-outline-2025",
    year: 2025,
    kind: "current-course",
    authenticityWeight: 1,
    formatFitWeight: 1,
    url: "https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics/econ1102-macroeconomics-1-course-outline-2025-term-2-details/132155065",
    notes:
      "Public course-outline preview: comprehensive final, lectures, required reading, tutorials and data exercises.",
  },
  {
    id: "current-unsw-handbook-2026",
    year: 2026,
    kind: "current-course",
    authenticityWeight: 1,
    formatFitWeight: 1,
    url: "https://handbook.unsw.edu.au/undergraduate/courses/2026/econ1102",
    notes: "Current UNSW handbook entry used as a current-course scope check.",
  },
  {
    id: "actual-final-2020",
    year: 2020,
    kind: "actual-final",
    authenticityWeight: 1,
    formatFitWeight: 0.6,
    url: "https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics/econ1102-final-exam-2020-t2/13869269",
    notes:
      "Public preview of a real ECON1102 T2 2020 final; strong content/reasoning evidence, weaker current-MCQ format fit.",
  },
  {
    id: "final-practice-2018-19",
    year: 2019,
    kind: "final-practice",
    authenticityWeight: 0.75,
    formatFitWeight: 1,
    url: "https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/econ1102-mcq-practice-it-is-a-good-revision-for-your-final-exam/5453129",
    notes:
      "Course-specific public MCQ practice; not authenticated as the final, but close in format and useful for repeated skill signals.",
  },
  {
    id: "sample-final-2020",
    year: 2020,
    kind: "sample-final",
    authenticityWeight: 0.85,
    formatFitWeight: 0.6,
    url: "https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/macro-1-final-sample-econ1102/13032548",
    notes:
      "Public 2020 sample/final-style material; useful for integrated reasoning and model selection.",
  },
  {
    id: "recent-course-assessments",
    year: 2025,
    kind: "recent-assessment",
    authenticityWeight: 0.55,
    formatFitWeight: 0.5,
    notes:
      "Current local lecture/tutorial/data-exercise bundle; lower final-frequency weight, higher current-truth value.",
  },
  {
    id: "historical-final-2004",
    year: 2004,
    kind: "historical-final",
    authenticityWeight: 0.25,
    formatFitWeight: 0.4,
    url: "https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/econ1102-final-exam-2004/7446882",
    notes:
      "Older public final used only as weak historical consistency evidence because it predates the current course structure.",
  },
]);

export const examEvidenceSourceById: ReadonlyMap<string, ExamEvidenceSource> = new Map(
  examEvidenceSources.map((source) => [source.id, source]),
);
