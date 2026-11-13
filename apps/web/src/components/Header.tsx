import type { ConnectionState } from "../hooks/useSocket";
import type { Theme } from "../hooks/useTheme";
import type { WallboardSnapshot } from "../types";

export function Header({ snapshot, clock, connectionState, theme, onToggleTheme, onOpenSettings }: {
  snapshot: WallboardSnapshot; clock: string;
  connectionState: ConnectionState; theme: Theme; onToggleTheme: () => void;
  onOpenSettings?: () => void;
}) {
  const tz = snapshot.period?.timezone;
  const updated = new Date(snapshot.generatedAt).toLocaleTimeString(undefined, { timeZone: tz });
  const period = snapshot.period?.label;

  return (
    <header className="header">
      <div className="header-brand">
        {snapshot.logoUrl && <img className="header-logo" src={snapshot.logoUrl} alt="" aria-hidden="true" />}
        <div>
          <h1>{snapshot.title}</h1>
          <p className="meta">
            Updated {updated}
            {period ? ` · ${period}` : ""}
            {snapshot.mock ? " · MOCK" : ""}
            {snapshot.error ? ` · ${snapshot.error}` : ""}
          </p>
        </div>
      </div>
      <div className="header-right">
        <span className={`connection-dot ${connectionState}`} title={connectionState} />
        <span className={`badge ${snapshot.stale ? "stale" : "live"}`}>
          {snapshot.stale ? "STALE" : "LIVE"}
        </span>
        <button className="theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {onOpenSettings && (
          <button className="settings-btn" onClick={onOpenSettings} aria-label="Open settings" title="Settings">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M17.4 12.3a1.5 1.5 0 00.3 1.65l.05.05a1.82 1.82 0 01-1.29 3.1 1.82 1.82 0 01-1.28-.53l-.06-.05a1.5 1.5 0 00-1.65-.3 1.5 1.5 0 00-.91 1.37V18a1.82 1.82 0 01-3.64 0v-.1a1.5 1.5 0 00-.98-1.37 1.5 1.5 0 00-1.65.3l-.05.06a1.82 1.82 0 01-2.58-2.58l.06-.05a1.5 1.5 0 00.3-1.65 1.5 1.5 0 00-1.37-.91H2a1.82 1.82 0 010-3.64h.1A1.5 1.5 0 003.47 7a1.5 1.5 0 00-.3-1.65l-.06-.05a1.82 1.82 0 012.58-2.58l.05.06a1.5 1.5 0 001.65.3h.07A1.5 1.5 0 008.37 1.7V2a1.82 1.82 0 013.64 0v.1a1.5 1.5 0 00.91 1.37 1.5 1.5 0 001.65-.3l.05-.06a1.82 1.82 0 012.58 2.58l-.06.05a1.5 1.5 0 00-.3 1.65v.07a1.5 1.5 0 001.37.91h.29a1.82 1.82 0 010 3.64h-.1a1.5 1.5 0 00-1.37.91z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        )}
        <div className="header-clock">
          {snapshot.watermark && <span className="watermark">{snapshot.watermark}</span>}
          <time className="clock">{clock}</time>
        </div>
      </div>
    </header>
  );
}
