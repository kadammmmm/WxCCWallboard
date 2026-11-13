import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

function getStored(): Theme {
  try {
    const v = localStorage.getItem("wallboard.theme");
    if (v === "light" || v === "dark") return v;
  } catch { /* private mode */ }
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStored);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("wallboard.theme", theme); } catch { /* ok */ }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return { theme, toggle };
}
