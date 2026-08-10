import {
  applyReviewToCardState,
  createReviewEvent,
  type CardState,
  type ReviewEvent,
} from "../domain/progress";
import { scoreMockAttempt } from "../exam/mock/scoring";
import {
  validateMockAttempt,
  type MockAttempt,
  type MockAttemptResult,
  type MockQuestionAttemptState,
} from "../exam/mock/model";
import { openProgressDatabase } from "./database";

export interface FinalizedMock {
  readonly attempt: MockAttempt;
  readonly result: MockAttemptResult;
  readonly reviewEvents: readonly ReviewEvent[];
}

export class MockExamRepository {
  private readonly database = openProgressDatabase();

  public constructor(
    private readonly validCardIds: ReadonlySet<string>,
    private readonly validQuestionIds: ReadonlySet<string>,
    private readonly transactionFailure?: (processedEvents: number) => void,
  ) {}

  public async listAttempts(): Promise<MockAttempt[]> {
    const database = await this.database;
    const attempts = await database.getAll("mockAttempts");
    return attempts.map((attempt) =>
      validateMockAttempt(attempt, this.validQuestionIds),
    );
  }

  public async getAttempt(id: string): Promise<MockAttempt | undefined> {
    const database = await this.database;
    const attempt = await database.get("mockAttempts", id);
    return attempt === undefined
      ? undefined
      : validateMockAttempt(attempt, this.validQuestionIds);
  }

  public async getActiveAttempt(): Promise<MockAttempt | undefined> {
    return (await this.listAttempts()).find((attempt) => attempt.status === "active");
  }

  public async createAttempt(attempt: MockAttempt): Promise<MockAttempt> {
    const validated = validateMockAttempt(attempt, this.validQuestionIds);
    const database = await this.database;
    const transaction = database.transaction("mockAttempts", "readwrite");
    const existing = (await transaction.store.get(validated.id)) as
      MockAttempt | undefined;
    if (existing !== undefined)
      throw new Error(`Mock attempt "${validated.id}" already exists.`);
    const active = (await transaction.store.getAll()).some(
      (candidate) => candidate.status === "active",
    );
    if (active) throw new Error("Only one unfinished mock exam can exist at a time.");
    await transaction.store.add(validated);
    await transaction.done;
    return validated;
  }

  public async updateAttemptProgress(
    id: string,
    questionStates: readonly MockQuestionAttemptState[],
    currentQuestionIndex: number,
  ): Promise<MockAttempt> {
    const database = await this.database;
    const transaction = database.transaction("mockAttempts", "readwrite");
    const current = (await transaction.store.get(id)) as MockAttempt | undefined;
    if (current === undefined) throw new Error("Mock attempt was not found.");
    if (current.status !== "active") {
      throw new Error("Submitted or abandoned mock attempts are immutable.");
    }
    const next = validateMockAttempt(
      { ...current, questionStates, currentQuestionIndex },
      this.validQuestionIds,
    );
    await transaction.store.put(next);
    await transaction.done;
    return next;
  }

  public async abandonAttempt(id: string, abandonedAt: string): Promise<MockAttempt> {
    const database = await this.database;
    const transaction = database.transaction("mockAttempts", "readwrite");
    const current = (await transaction.store.get(id)) as MockAttempt | undefined;
    if (current === undefined) throw new Error("Mock attempt was not found.");
    if (current.status !== "active") return current;
    const next = validateMockAttempt(
      { ...current, status: "abandoned", abandonedAt },
      this.validQuestionIds,
    );
    await transaction.store.put(next);
    await transaction.done;
    return next;
  }

  public async finalizeAttempt(
    id: string,
    submittedAt: string,
  ): Promise<FinalizedMock> {
    const database = await this.database;
    const transaction = database.transaction(
      ["mockAttempts", "cardStates", "reviewEvents"],
      "readwrite",
    );
    const attempt = (await transaction.objectStore("mockAttempts").get(id)) as
      MockAttempt | undefined;
    if (attempt === undefined) throw new Error("Mock attempt was not found.");
    if (attempt.status === "submitted") {
      await transaction.done;
      return { attempt, result: scoreMockAttempt(attempt), reviewEvents: [] };
    }
    if (attempt.status === "abandoned") {
      throw new Error("Abandoned mock attempts cannot be submitted.");
    }

    const stateById = new Map(
      attempt.questionStates.map((state) => [state.questionId, state]),
    );
    const events = attempt.manifest.map((manifest) => {
      const state = stateById.get(manifest.questionId);
      if (state === undefined)
        throw new Error(`Missing state for ${manifest.questionId}.`);
      const selectedChoice = state.selectedChoice;
      return createReviewEvent({
        id: `mock:${attempt.id}:${manifest.questionId}`,
        cardId: manifest.reviewCardId,
        reviewedAt: state.lastAnsweredAt ?? submittedAt,
        mode: "mcq",
        rating: null,
        correct: selectedChoice !== null && selectedChoice === manifest.correctChoice,
        responseTimeMs: state.timeSpentMs,
        selectedChoice,
      });
    });
    const cardStateStore = transaction.objectStore("cardStates");
    const reviewStore = transaction.objectStore("reviewEvents");
    for (const [index, event] of events.entries()) {
      if (!this.validCardIds.has(event.cardId)) {
        throw new Error(`Unknown review card "${event.cardId}".`);
      }
      const previous = (await cardStateStore.get(event.cardId)) as
        CardState | undefined;
      await cardStateStore.put(applyReviewToCardState(previous, event));
      await reviewStore.add(event);
      try {
        this.transactionFailure?.(index + 1);
      } catch (error: unknown) {
        transaction.abort();
        try {
          await transaction.done;
        } catch {
          // Preserve the injected/underlying failure while consuming the
          // transaction's expected AbortError.
        }
        throw error;
      }
    }
    const submitted = validateMockAttempt(
      {
        ...attempt,
        status: "submitted",
        submittedAt,
        reviewEventsCommittedAt: submittedAt,
      },
      this.validQuestionIds,
    );
    await transaction.objectStore("mockAttempts").put(submitted);
    await transaction.done;
    return {
      attempt: submitted,
      result: scoreMockAttempt(submitted),
      reviewEvents: events,
    };
  }

  public async close(): Promise<void> {
    const database = await this.database;
    database.close();
  }
}
