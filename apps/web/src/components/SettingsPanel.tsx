import { useState } from "react";
import type { Theme } from "../hooks/useTheme";

interface Props {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  marqueeText: string;
  onMarqueeChange: (text: string) => void;
}

export function SettingsPanel({ open, onClose, theme, onToggleTheme, marqueeText, onMarqueeChange }: Props) {
  const [text, setText] = useState(marqueeText);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <aside className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">&times;</button>
        </div>
        <div className="settings-body">
          <div className="setting-group">
            <label className="setting-label">Theme</label>
            <div className="setting-row">
              <button className={`theme-btn${theme === "dark" ? " active" : ""}`} onClick={theme === "light" ? onToggleTheme : undefined}>Dark</button>
              <button className={`theme-btn${theme === "light" ? " active" : ""}`} onClick={theme === "dark" ? onToggleTheme : undefined}>Light</button>
            </div>
          </div>
          <div className="setting-group">
            <label className="setting-label" htmlFor="marquee-input">Scrolling Message</label>
            <input
              id="marquee-input"
              className="setting-input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter announcement text..."
            />
            <button className="setting-apply" onClick={() => onMarqueeChange(text)}>Apply</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
