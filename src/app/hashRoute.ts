import {
  DEFAULT_STUDY_SCOPE,
  parseStudyScopeQuery,
  type StudyScope,
} from "../study/studyScope";

export type AppRoute =
  "/" | "/study" | "/settings" | "/mock" | "/mock/attempt" | "/practice";

export interface ParsedHashLocation {
  readonly route: AppRoute;
  readonly studyScope: StudyScope;
  readonly attemptId: string | null;
  readonly practiceMode: "mcq" | "stimulus" | "written" | "calculations" | null;
  readonly pairingCode?: string | null;
}

export function parseHashLocation(hash: string): ParsedHashLocation {
  const rawLocation = hash.replace(/^#/, "") || "/";
  const queryIndex = rawLocation.indexOf("?");
  const path = queryIndex === -1 ? rawLocation : rawLocation.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : rawLocation.slice(queryIndex + 1);

  if (path === "/study") {
    return {
      route: "/study",
      studyScope: parseStudyScopeQuery(query),
      attemptId: null,
      practiceMode: null,
    };
  }

  if (path === "/settings") {
    const params = safeParams(query);
    return {
      route: "/settings",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
      pairingCode: params.get("pair"),
    };
  }

  if (path === "/mock") {
    return {
      route: "/mock",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
    };
  }

  if (path === "/mock/attempt") {
    const params = safeParams(query);
    const id = params.get("id");
    if (id !== null && id.trim() !== "") {
      return {
        route: "/mock/attempt",
        studyScope: DEFAULT_STUDY_SCOPE,
        attemptId: id,
        practiceMode: null,
      };
    }
    return {
      route: "/mock",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
    };
  }

  if (path === "/practice") {
    const mode = safeParams(query).get("mode");
    return {
      route: "/practice",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode:
        mode === "mcq" ||
        mode === "stimulus" ||
        mode === "written" ||
        mode === "calculations"
          ? mode
          : null,
    };
  }

  return {
    route: "/",
    studyScope: DEFAULT_STUDY_SCOPE,
    attemptId: null,
    practiceMode: null,
  };
}

function safeParams(query: string): URLSearchParams {
  try {
    return new URLSearchParams(query);
  } catch {
    return new URLSearchParams();
  }
}
