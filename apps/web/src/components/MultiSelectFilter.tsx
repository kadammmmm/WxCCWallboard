import { useEffect, useMemo, useRef, useState } from "react";
import type { FilterSelection } from "../hooks/useFilterSelection";

export interface FilterOption { value: string; label: string }

export function MultiSelectFilter({
  label, noun, options, selected, onChange,
}: {
  label: string; noun: string; options: FilterOption[];
  selected: FilterSelection; onChange: (next: FilterSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const optionValues = useMemo(() => options.map((o) => o.value), [options]);
  const isAll = selected === null;
  const selectedSet = useMemo(() => new Set(isAll ? optionValues : selected), [isAll, optionValues, selected]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onPointer = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const summary = (() => {
    if (options.length === 0) return label;
    if (isAll || selectedSet.size === options.length) return `All ${noun}`;
    if (selectedSet.size === 0) return `No ${noun}`;
    if (selectedSet.size === 1) return options.find((o) => selectedSet.has(o.value))?.label ?? `1 ${noun}`;
    return `${selectedSet.size} ${noun}`;
  })();

  function commit(next: string[]) {
    const unique = [...new Set(next)];
    onChange(unique.length === options.length ? null : unique);
  }

  function toggle(value: string) {
    const current = isAll ? optionValues : [...selectedSet];
    commit(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  }

  return (
    <div className="filter" ref={rootRef}>
      <button type="button" className={`filter-toggle${open || !isAll ? " active" : ""}`} aria-haspopup="true" aria-expanded={open} disabled={options.length === 0} onClick={() => setOpen((v) => !v)}>
        <span className="filter-toggle-label">{summary}</span>
        <span className="filter-caret" aria-hidden="true" />
      </button>
      {open && (
        <div className="filter-menu" role="group">
          <input ref={searchRef} className="filter-search" type="search" placeholder={`Filter ${noun}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="filter-actions">
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(null)}>All</button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange([])}>None</button>
          </div>
          <ul className="filter-options">
            {visible.length === 0 ? <li className="filter-empty">No matches</li> : visible.map((opt) => {
              const checked = selectedSet.has(opt.value);
              return (
                <li key={opt.value}>
                  <button type="button" aria-pressed={checked} className={`filter-option${checked ? " selected" : ""}`} onMouseDown={(e) => { e.preventDefault(); toggle(opt.value); }}>
                    <span className="filter-check" aria-hidden="true" />
                    <span>{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
