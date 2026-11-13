import { useLayoutEffect, useState, type RefObject } from "react";

export type RosterDensity = "full" | "compact" | "dense";
export interface RosterLayout { cols: number; scale: number; density: RosterDensity }

const GAP = 8;
const MIN_W = 240;
const REF_H = 92;

function compute(count: number, width: number, height: number): RosterLayout {
  if (count <= 0 || width <= 0 || height <= 0) return { cols: 1, scale: 1, density: "full" };

  let best = { cols: 1, cardW: width, cardH: 0, score: -Infinity };
  const maxCols = Math.min(count, Math.max(1, Math.floor((width + GAP) / (MIN_W + GAP))));

  for (let cols = 1; cols <= maxCols; cols++) {
    const rows = Math.ceil(count / cols);
    const cardW = (width - GAP * (cols - 1)) / cols;
    const cardH = (height - GAP * (rows - 1)) / rows;
    if (cardW < 1 || cardH < 1) continue;
    const unused = cols * rows - count;
    const score = Math.min(cardH / 70, 1.15) * Math.min(cardW / 320, 1.1) * cardW * cardH - unused * 400;
    if (score > best.score) best = { cols, cardW, cardH, score };
  }

  const scale = Math.max(0.55, Math.min(1, best.cardH / REF_H));
  const density: RosterDensity = best.cardH >= 76 && best.cardW >= 280 ? "full" : best.cardH >= 48 && best.cardW >= 200 ? "compact" : "dense";
  return { cols: best.cols, scale, density };
}

export function useRosterLayout(ref: RefObject<HTMLElement | null>, count: number): RosterLayout {
  const [layout, setLayout] = useState<RosterLayout>({ cols: 1, scale: 1, density: "full" });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setLayout(compute(count, el.clientWidth, el.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, ref]);

  return layout;
}
