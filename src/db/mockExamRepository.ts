import {
  createReviewEvent,
  deriveCardStateFromReviews,
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
    // Historical submitted/abandoned attempts remain portable when a later
    // app version no longer ships one of their display questions. Structural
    // validation is still strict; current-bank availability is a separate
    // concern for new and active attempts.
    return attempts.map((attempt) => validateMockAttempt(attempt));
  }

  public async getAttempt(id: string): Promise<MockAttempt | undefined> {
    const database = await this.database;
    const attempt = await database.get("mockAttempts", id);
    return attempt === undefined ? undefined : validateMockAttempt(attempt);
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
    if (!Number.isFinite(Date.parse(abandonedAt)))
      throw new Error("Abandon timestamp must be a valid date-time.");
    if (Date.parse(abandonedAt) >= Date.parse(current.writingEndsAt)) {
      throw new Error("An expired mock must be finalised and cannot be abandoned.");
    }
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
    committedAt = submittedAt,
  ): Promise<FinalizedMock> {
    const database = await this.database;
    const transaction = database.transaction(
      ["mockAttempts", "cardStates", "reviewEvents"],
      "readwrite",
    );
    try {
      const attemptValue = await transaction.objectStore("mockAttempts").get(id);
      if (attemptValue === undefined) throw new Error("Mock attempt was not found.");
      const structuralAttempt = validateMockAttempt(attemptValue);
      if (structuralAttempt.status === "submitted") {
        await transaction.done;
        return {
          attempt: structuralAttempt,
          result: scoreMockAttempt(structuralAttempt),
          reviewEvents: [],
        };
      }
      if (structuralAttempt.status === "abandoned") {
        throw new Error("Abandoned mock attempts cannot be submitted.");
      }
      const attempt = validateMockAttempt(structuralAttempt, this.validQuestionIds);
      const effectiveSubmittedAt =
        Number.isFinite(Date.parse(submittedAt)) &&
        Date.parse(submittedAt) >= Date.parse(attempt.writingEndsAt)
          ? attempt.writingEndsAt
          : submittedAt;

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
          reviewedAt: state.lastAnsweredAt ?? effectiveSubmittedAt,
          mode: "mcq",
          rating: null,
          correct: selectedChoice !== null && selectedChoice === manifest.correctChoice,
          responseTimeMs: state.timeSpentMs,
          selectedChoice,
        });
      });
      const cardStateStore = transaction.objectStore("cardStates");
      const reviewStore = transaction.objectStore("reviewEvents");
      const existingReviews = (await reviewStore.getAll()) as ReviewEvent[];
      const eventsByCard = new Map<string, ReviewEvent[]>();
      for (const event of events) {
        if (!this.validCardIds.has(event.cardId)) {
          throw new Error(`Unknown review card "${event.cardId}".`);
        }
        const cardEvents = eventsByCard.get(event.cardId) ?? [];
        cardEvents.push(event);
        eventsByCard.set(event.cardId, cardEvents);
      }

      // Mock answers retain their historical timestamps. Rebuild each
      // affected derived state from the complete chronological event history
      // so a delayed mock cannot roll a newer Study/Practice state backwards.
      for (const [cardId, newEvents] of eventsByCard) {
        await cardStateStore.put(
          deriveCardStateFromReviews(cardId, [...existingReviews, ...newEvents]),
        );
      }
      for (const [index, event] of events.entries()) {
        await reviewStore.add(event);
        this.transactionFailure?.(index + 1);
      }
      const submitted = validateMockAttempt(
        {
          ...attempt,
          status: "submitted",
          submittedAt: effectiveSubmittedAt,
          reviewEventsCommittedAt: committedAt,
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
    } catch (error: unknown) {
      // Application-level failures (including validation and injected
      // failures) must abort just as IndexedDB request failures do.
      try {
        transaction.abort();
      } catch {
        // The transaction may already have been aborted by IndexedDB.
      }
      try {
        await transaction.done;
      } catch {
        // Preserve the application error while consuming AbortError.
      }
      throw error;
    }
  }

  public async close(): Promise<void> {
    const database = await this.database;
    database.close();
  }
}
