import {
  DEFAULT_STUDY_SCOPE,
  parseStudyScopeQuery,
  type StudyScope,
} from "../study/studyScope";

export type AppRoute = "/" | "/study" | "/settings";

export interface ParsedHashLocation {
  readonly route: AppRoute;
  readonly studyScope: StudyScope;
}

export function parseHashLocation(hash: string): ParsedHashLocation {
  const rawLocation = hash.replace(/^#/, "") || "/";
  const queryIndex = rawLocation.indexOf("?");
  const path = queryIndex === -1 ? rawLocation : rawLocation.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : rawLocation.slice(queryIndex + 1);

  if (path === "/study") {
    return { route: "/study", studyScope: parseStudyScopeQuery(query) };
  }

  if (path === "/settings") {
    return { route: "/settings", studyScope: DEFAULT_STUDY_SCOPE };
  }

  return { route: "/", studyScope: DEFAULT_STUDY_SCOPE };
}
