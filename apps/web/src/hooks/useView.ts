import { useCallback, useState } from "react";
import type { ViewId } from "../types";

function getStored(): ViewId {
  try {
    const v = localStorage.getItem("wallboard.view") as ViewId | null;
    if (v === "overview" || v === "agents" || v === "queues") return v;
  } catch { /* private mode */ }
  return "overview";
}

export function useView() {
  const [view, setView] = useState<ViewId>(getStored);

  const navigate = useCallback((next: ViewId) => {
    setView(next);
    try { localStorage.setItem("wallboard.view", next); } catch { /* ok */ }
  }, []);

  return { view, navigate };
}
