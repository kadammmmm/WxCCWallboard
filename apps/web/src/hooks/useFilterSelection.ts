import { useCallback, useState } from "react";

export type FilterSelection = string[] | null;

function readStored(key: string): FilterSelection {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "*") return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((v): v is string => typeof v === "string");
  } catch { return null; }
}

export function useFilterSelection(storageKey: string) {
  const [selected, setSelected] = useState<FilterSelection>(() => readStored(storageKey));

  const update = useCallback((next: FilterSelection) => {
    setSelected(next);
    try {
      localStorage.setItem(storageKey, next === null ? "*" : JSON.stringify(next));
    } catch { /* ok */ }
  }, [storageKey]);

  return [selected, update] as const;
}

export function applySelection<T>(items: T[], selected: FilterSelection, valueOf: (item: T) => string): T[] {
  if (selected === null) return items;
  const allowed = new Set(selected);
  return items.filter((item) => allowed.has(valueOf(item)));
}
