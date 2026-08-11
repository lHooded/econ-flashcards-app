export type KnowledgeSourceKind =
  "lecture" | "textbook" | "canonical-deck" | "question-bank";

export interface KnowledgeSourceRef {
  readonly sourceId: string;
  readonly page: number;
  readonly note: string;
}

export interface KnowledgeExample {
  readonly title: string;
  readonly text: string;
  readonly takeaway?: string;
}

export interface KnowledgeEquationVariable {
  readonly symbol: string;
  readonly meaning: string;
  readonly units?: string;
}

export interface KnowledgeEquation {
  readonly label: string;
  readonly expression: string;
  readonly variables: readonly KnowledgeEquationVariable[];
  readonly interpretation: string;
}

export interface KnowledgeContrast {
  readonly conceptId: string;
  readonly title: string;
  readonly difference: string;
}

export interface KnowledgeConceptRecord {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly searchTerms: readonly string[];
  readonly chapters: readonly number[];
  readonly tags: readonly string[];
  readonly summary: string;
  readonly intuition: string;
  readonly explanation: readonly string[];
  readonly whyItMatters: string;
  readonly prerequisites: readonly string[];
  readonly relatedConcepts: readonly string[];
  readonly mechanism?: readonly string[];
  readonly examples?: readonly KnowledgeExample[];
  readonly equations?: readonly KnowledgeEquation[];
  readonly misconceptions?: readonly string[];
  readonly contrasts?: readonly KnowledgeContrast[];
  readonly sourceRefs: readonly KnowledgeSourceRef[];
}

export interface KnowledgeConcept extends KnowledgeConceptRecord {
  readonly linkedCardIds: readonly string[];
  readonly linkedQuestionIds: readonly string[];
}

export type KnowledgeConceptStatus = "unseen" | "learning" | "needs-work" | "solid";

export interface KnowledgeSource {
  readonly id: string;
  readonly kind: KnowledgeSourceKind;
  readonly label: string;
  readonly path: string;
  readonly description: string;
}

export interface KnowledgeCardConceptEntry {
  readonly cardId: string;
  readonly conceptIds: readonly string[];
}

export interface KnowledgeContentMap {
  readonly cards: Readonly<Record<string, readonly string[]>>;
  readonly entries: readonly KnowledgeCardConceptEntry[];
  readonly fallbackMappings: number;
}

export interface KnowledgeTermMatch {
  readonly conceptId: string | null;
  readonly conceptIds: readonly string[];
  readonly alias: string;
  readonly start: number;
  readonly end: number;
}
