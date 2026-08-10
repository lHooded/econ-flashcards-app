export const MOCK_BLUEPRINT = Object.freeze({
  total: 60,
  mixedChapterCount: 10,
  chapterQuestionCount: 5,
  graphCount: 10,
  tableCount: 5,
  difficultyRanges: Object.freeze({
    1: [15, 21],
    2: [27, 33],
    3: [9, 15],
  }),
  minimumCalculation: 10,
  minimumScenarioOrModel: 20,
  minimumSequence: 2,
  answerPositionRange: [12, 18],
});

export const MOCK_READING_MS = 10 * 60 * 1000;
export const MOCK_WRITING_MS = 100 * 60 * 1000;
