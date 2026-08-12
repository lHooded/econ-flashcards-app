import { useEffect, useState } from "react";
import { ProgressProvider } from "./ProgressProvider";
import { useProgress } from "./progressContext";
import { AppShell } from "../components/AppShell";
import { HomePage } from "../pages/HomePage";
import { SettingsPage } from "../pages/SettingsPage";
import { MockPage } from "../pages/MockPage";
import { MockAttemptPage } from "../pages/MockAttemptPage";
import { PracticePage } from "../pages/PracticePage";
import { StudyPage } from "../pages/StudyPage";
import { KnowledgePage } from "../pages/KnowledgePage";
import { GuidedCramPage } from "../pages/GuidedCramPage";
import type { ParsedHashLocation } from "./hashRoute";
import { capturePairingRoute } from "./pairingRoute";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";

export type { AppRoute } from "./hashRoute";

function useHashRoute(): ParsedHashLocation {
  const [location, setLocation] = useState<ParsedHashLocation>(() =>
    capturePairingRoute(),
  );

  useEffect(() => {
    const onHashChange = () => setLocation(capturePairingRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return location;
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite">
      <div className="brand-mark" aria-hidden="true">
        EC
      </div>
      <p className="eyebrow">Econ Cram Cards</p>
      <h1>Opening your local study desk…</h1>
      <p>Loading the bundled deck and local progress.</p>
    </main>
  );
}

function StartupError({ message }: { message: string }) {
  return (
    <main className="loading-screen" role="alert">
      <div className="brand-mark brand-mark-error" aria-hidden="true">
        !
      </div>
      <p className="eyebrow">Econ Cram Cards</p>
      <h1>Local study data could not be opened.</h1>
      <p>{message}</p>
      <p className="muted-text">
        Try reloading the app. Your browser may be blocking IndexedDB for this site.
      </p>
    </main>
  );
}

function Application() {
  const { route, studyScope, attemptId, practiceMode, pairingCode, conceptId } =
    useHashRoute();
  const { snapshot, isLoading, error, clearError } = useProgress();

  if (isLoading || snapshot === null) {
    return error ? <StartupError message={error} /> : <LoadingScreen />;
  }

  return (
    <AppShell route={route} error={error} onDismissError={clearError}>
      {route === "/study" ? (
        <StudyPage scope={studyScope} conceptId={conceptId} />
      ) : route === "/settings" ? (
        <SettingsPage initialPairingCode={pairingCode} />
      ) : route === "/mock" ? (
        <MockPage />
      ) : route === "/mock/attempt" && attemptId !== null ? (
        <MockAttemptPage attemptId={attemptId} />
      ) : route === "/practice" ? (
        <PracticePage initialMode={practiceMode} initialConceptId={conceptId} />
      ) : route === "/knowledge" ? (
        <KnowledgePage initialConceptId={conceptId} />
      ) : route === "/guided" ? (
        <GuidedCramPage key="guided-cram" initialConceptId={conceptId} />
      ) : route === "/high-yield" ? (
        <GuidedCramPage
          key="high-yield-cram"
          initialConceptId={conceptId}
          mode="high-yield"
        />
      ) : (
        <HomePage />
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <ProgressProvider>
      <KnowledgeProvider>
        <Application />
      </KnowledgeProvider>
    </ProgressProvider>
  );
}
