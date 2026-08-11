import type { KnowledgeConceptRecord, KnowledgeSourceRef } from "./model";

export const L = (
  sourceId: string,
  page: number,
  note: string,
): KnowledgeSourceRef => ({ sourceId, page, note });

export const T = (page: number, note: string): KnowledgeSourceRef =>
  L("textbook", page, note);

export function c(input: KnowledgeConceptRecord): KnowledgeConceptRecord {
  return input;
}

export function freezeConceptRecords(
  records: readonly KnowledgeConceptRecord[],
): readonly KnowledgeConceptRecord[] {
  return Object.freeze(
    records.map((record) =>
      Object.freeze({
        ...record,
        aliases: Object.freeze([...record.aliases]),
        searchTerms: Object.freeze([...record.searchTerms]),
        chapters: Object.freeze([...record.chapters]),
        tags: Object.freeze([...record.tags]),
        explanation: Object.freeze([...record.explanation]),
        prerequisites: Object.freeze([...record.prerequisites]),
        relatedConcepts: Object.freeze([...record.relatedConcepts]),
        mechanism:
          record.mechanism === undefined
            ? undefined
            : Object.freeze([...record.mechanism]),
        examples:
          record.examples === undefined
            ? undefined
            : Object.freeze(
                record.examples.map((example) => Object.freeze({ ...example })),
              ),
        equations:
          record.equations === undefined
            ? undefined
            : Object.freeze(
                record.equations.map((equation) =>
                  Object.freeze({
                    ...equation,
                    variables: Object.freeze(
                      equation.variables.map((variable) =>
                        Object.freeze({ ...variable }),
                      ),
                    ),
                  }),
                ),
              ),
        misconceptions:
          record.misconceptions === undefined
            ? undefined
            : Object.freeze([...record.misconceptions]),
        contrasts:
          record.contrasts === undefined
            ? undefined
            : Object.freeze(
                record.contrasts.map((contrast) => Object.freeze({ ...contrast })),
              ),
        sourceRefs: Object.freeze(
          record.sourceRefs.map((sourceRef) => Object.freeze({ ...sourceRef })),
        ),
      }),
    ),
  );
}
