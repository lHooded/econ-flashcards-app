import { createContext, useContext } from "react";

export type KnowledgeDisclosure = "preview" | "full";

export interface KnowledgeContextValue {
  readonly openConcept: (conceptId: string, disclosure?: KnowledgeDisclosure) => void;
  readonly openConceptChoices: (
    conceptIds: readonly string[],
    disclosure?: KnowledgeDisclosure,
  ) => void;
  readonly pushConcept: (conceptId: string, disclosure?: KnowledgeDisclosure) => void;
  readonly chooseConcept: (conceptId: string) => void;
  readonly backConcept: () => void;
  readonly closeConcept: () => void;
}

export const KnowledgeContext = createContext<KnowledgeContextValue | undefined>(
  undefined,
);

export function useKnowledge(): KnowledgeContextValue {
  const value = useContext(KnowledgeContext);
  // Prose components are also used in isolated unit tests and embeddable
  // surfaces. Without a provider they remain plain text rather than making
  // the surrounding feature impossible to render.
  return (
    value ?? {
      openConcept: () => undefined,
      openConceptChoices: () => undefined,
      pushConcept: () => undefined,
      chooseConcept: () => undefined,
      backConcept: () => undefined,
      closeConcept: () => undefined,
    }
  );
}
