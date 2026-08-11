import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { KnowledgeSheet } from "../components/knowledge/KnowledgeSheet";
import {
  KnowledgeContext,
  type KnowledgeContextValue,
  type KnowledgeDisclosure,
  type KnowledgeLookupOptions,
} from "./KnowledgeContext";
import { knowledgeConceptById } from "./data";

export function KnowledgeProvider({ children }: PropsWithChildren) {
  const [stack, setStack] = useState<readonly string[]>([]);
  const [choiceIds, setChoiceIds] = useState<readonly string[]>([]);
  const [disclosure, setDisclosure] = useState<KnowledgeDisclosure>("full");
  const [blockedLabel, setBlockedLabel] = useState<string | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const stackRef = useRef<readonly string[]>([]);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  const openConcept = useCallback(
    (
      conceptId: string,
      nextDisclosure: KnowledgeDisclosure = "full",
      options: KnowledgeLookupOptions = {},
    ) => {
      if (!knowledgeConceptById.has(conceptId)) return;
      if (
        nextDisclosure === "preview" &&
        options.testedConceptIds?.includes(conceptId)
      ) {
        return;
      }
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setChoiceIds([]);
      setBlockedLabel(null);
      setDisclosure(nextDisclosure);
      setStack([conceptId]);
    },
    [],
  );

  const openConceptChoices = useCallback(
    (
      conceptIds: readonly string[],
      nextDisclosure: KnowledgeDisclosure = "full",
      options: KnowledgeLookupOptions = {},
    ) => {
      const validIds = conceptIds.filter(
        (conceptId) =>
          knowledgeConceptById.has(conceptId) &&
          !(
            nextDisclosure === "preview" &&
            options.testedConceptIds?.includes(conceptId)
          ),
      );
      if (validIds.length === 0) return;
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setBlockedLabel(null);
      setDisclosure(nextDisclosure);
      setStack([]);
      setChoiceIds(validIds);
    },
    [],
  );

  const openBlockedTerm = useCallback((label: string) => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStack([]);
    setChoiceIds([]);
    setDisclosure("preview");
    setBlockedLabel(label);
  }, []);

  const chooseConcept = useCallback((conceptId: string) => {
    if (!knowledgeConceptById.has(conceptId)) return;
    setChoiceIds([]);
    setBlockedLabel(null);
    setStack([conceptId]);
  }, []);

  const pushConcept = useCallback(
    (
      conceptId: string,
      nextDisclosure: KnowledgeDisclosure = "full",
      options: KnowledgeLookupOptions = {},
    ) => {
      if (!knowledgeConceptById.has(conceptId)) return;
      if (
        nextDisclosure === "preview" &&
        options.testedConceptIds?.includes(conceptId)
      ) {
        return;
      }
      if (stackRef.current.length === 0) {
        previousFocus.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      setChoiceIds([]);
      setBlockedLabel(null);
      setStack((current) =>
        current.includes(conceptId)
          ? [...current.slice(0, current.indexOf(conceptId) + 1)]
          : [...current, conceptId],
      );
      setDisclosure(nextDisclosure);
    },
    [],
  );

  const closeConcept = useCallback(() => {
    setStack([]);
    setChoiceIds([]);
    setBlockedLabel(null);
    window.setTimeout(() => previousFocus.current?.focus(), 0);
  }, []);

  const backConcept = useCallback(() => {
    if (choiceIds.length > 0 || stack.length <= 1) {
      closeConcept();
      return;
    }
    setStack((current) => current.slice(0, -1));
  }, [choiceIds.length, closeConcept, stack.length]);

  useEffect(() => {
    if (stack.length === 0 && choiceIds.length === 0 && blockedLabel === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeConcept();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [blockedLabel, choiceIds.length, closeConcept, stack.length]);

  const value: KnowledgeContextValue = {
    openConcept,
    openConceptChoices,
    pushConcept,
    openBlockedTerm,
    chooseConcept,
    backConcept,
    closeConcept,
  };

  return (
    <KnowledgeContext.Provider value={value}>
      {children}
      <KnowledgeSheet
        stack={stack}
        choiceIds={choiceIds}
        disclosure={disclosure}
        blockedLabel={blockedLabel}
      />
    </KnowledgeContext.Provider>
  );
}
