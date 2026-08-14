import {
  DEFAULT_STUDY_SCOPE,
  parseStudyScopeQuery,
  type StudyScope,
} from "../study/studyScope";

export type AppRoute =
  | "/"
  | "/study"
  | "/settings"
  | "/mock"
  | "/mock/attempt"
  | "/practice"
  | "/knowledge"
  | "/guided"
  | "/high-yield"
  | "/super-cram";

export interface ParsedHashLocation {
  readonly route: AppRoute;
  readonly studyScope: StudyScope;
  readonly attemptId: string | null;
  readonly practiceMode:
    "mcq" | "stimulus" | "written" | "calculations" | "formula-application" | null;
  readonly conceptId: string | null;
  readonly pairingCode?: string | null;
}

export function parseHashLocation(hash: string): ParsedHashLocation {
  const rawLocation = hash.replace(/^#/, "") || "/";
  const queryIndex = rawLocation.indexOf("?");
  const path = queryIndex === -1 ? rawLocation : rawLocation.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : rawLocation.slice(queryIndex + 1);

  if (path === "/study") {
    const params = safeParams(query);
    return {
      route: "/study",
      studyScope: parseStudyScopeQuery(query),
      attemptId: null,
      practiceMode: null,
      conceptId: params.get("concept")?.trim() || null,
    };
  }

  if (path === "/settings") {
    const params = safeParams(query);
    return {
      route: "/settings",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
      conceptId: null,
      pairingCode: params.get("pair"),
    };
  }

  if (path === "/mock") {
    return {
      route: "/mock",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
      conceptId: null,
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
        conceptId: null,
      };
    }
    return {
      route: "/mock",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
      conceptId: null,
    };
  }

  if (path === "/practice") {
    const params = safeParams(query);
    const mode = params.get("mode");
    return {
      route: "/practice",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode:
        mode === "mcq" ||
        mode === "stimulus" ||
        mode === "written" ||
        mode === "calculations" ||
        mode === "formula-application"
          ? mode
          : null,
      conceptId: params.get("concept")?.trim() || null,
    };
  }

  if (path === "/knowledge") {
    const conceptId = safeParams(query).get("concept");
    return {
      route: "/knowledge",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
      conceptId: conceptId?.trim() || null,
    };
  }

  if (path === "/guided") {
    const conceptId = safeParams(query).get("concept");
    return {
      route: "/guided",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
      conceptId: conceptId?.trim() || null,
    };
  }

  if (path === "/high-yield") {
    const conceptId = safeParams(query).get("concept");
    return {
      route: "/high-yield",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
      conceptId: conceptId?.trim() || null,
    };
  }

  if (path === "/super-cram") {
    return {
      route: "/super-cram",
      studyScope: DEFAULT_STUDY_SCOPE,
      attemptId: null,
      practiceMode: null,
      conceptId: null,
    };
  }

  return {
    route: "/",
    studyScope: DEFAULT_STUDY_SCOPE,
    attemptId: null,
    practiceMode: null,
    conceptId: null,
  };
}

function safeParams(query: string): URLSearchParams {
  try {
    return new URLSearchParams(query);
  } catch {
    return new URLSearchParams();
  }
}
