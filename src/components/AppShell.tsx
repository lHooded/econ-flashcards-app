import type { PropsWithChildren } from "react";
import type { AppRoute } from "../app/hashRoute";

interface AppShellProps extends PropsWithChildren {
  readonly route: AppRoute;
  readonly error: string | null;
  readonly onDismissError: () => void;
}

const navigation = [
  { href: "#/", route: "/" as const, label: "Home" },
  { href: "#/study", route: "/study" as const, label: "Study" },
  { href: "#/guided", route: "/guided" as const, label: "Guided Cram" },
  { href: "#/mock", route: "/mock" as const, label: "Mock exam" },
  { href: "#/practice", route: "/practice" as const, label: "Practice Lab" },
  { href: "#/knowledge", route: "/knowledge" as const, label: "Knowledge" },
  { href: "#/settings", route: "/settings" as const, label: "Settings / Data" },
];

export function AppShell({ route, error, onDismissError, children }: AppShellProps) {
  return (
    <div className="app-frame">
      <header className="topbar">
        <a className="wordmark" href="#/" aria-label="Econ Cram Cards home">
          <span className="wordmark-icon" aria-hidden="true">
            EC
          </span>
          <span>
            <strong>Econ Cram Cards</strong>
            <small>Macroeconomics · Chapters 1–10</small>
          </span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a
              className={`nav-link ${route === item.route ? "nav-link-active" : ""}`}
              href={item.href}
              aria-current={route === item.route ? "page" : undefined}
              key={item.route}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      {error !== null && (
        <div className="app-error" role="alert">
          <span>{error}</span>
          <button className="icon-button" type="button" onClick={onDismissError}>
            <span className="sr-only">Dismiss error</span>×
          </button>
        </div>
      )}

      <main className="page-content">{children}</main>
    </div>
  );
}
