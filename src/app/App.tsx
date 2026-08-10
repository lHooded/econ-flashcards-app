import { useEffect, useState } from "react";
import { ProgressProvider } from "./ProgressProvider";
import { useProgress } from "./progressContext";
import { AppShell } from "../components/AppShell";
import { HomePage } from "../pages/HomePage";
import { SettingsPage } from "../pages/SettingsPage";
import { StudyPage } from "../pages/StudyPage";
import { parseHashLocation, type ParsedHashLocation } from "./hashRoute";

export type { AppRoute } from "./hashRoute";

function useHashRoute(): ParsedHashLocation {
  const [location, setLocation] = useState<ParsedHashLocation>(() =>
    parseHashLocation(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setLocation(parseHashLocation(window.location.hash));
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
  const { route, studyScope } = useHashRoute();
  const { snapshot, isLoading, error, clearError } = useProgress();

  if (isLoading || snapshot === null) {
    return error ? <StartupError message={error} /> : <LoadingScreen />;
  }

  return (
    <AppShell route={route} error={error} onDismissError={clearError}>
      {route === "/study" ? (
        <StudyPage scope={studyScope} />
      ) : route === "/settings" ? (
        <SettingsPage />
      ) : (
        <HomePage />
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <ProgressProvider>
      <Application />
    </ProgressProvider>
  );
}
