import { formatDuration } from "../hooks/useClock";
import type { FilterSelection } from "../hooks/useFilterSelection";
import { applySelection } from "../hooks/useFilterSelection";
import { Sparkline } from "./Sparkline";
import type { HistoryPoint, QueueRow, WallboardSnapshot } from "../types";

function slaClass(pct: number): string {
  if (pct >= 85) return "ok";
  if (pct >= 70) return "warn";
  return "bad";
}

function toSLPct(withinSla: number, answered: number): number {
  return answered <= 0 ? 0 : Math.min(100, Math.round((withinSla / answered) * 1000) / 10);
}

function slForSelection(queues: QueueRow[], selected: FilterSelection, fallback: number): number {
  if (selected === null) return fallback;
  const visible = applySelection(queues, selected, (q) => q.id);
  const answered = visible.reduce((s, q) => s + (q.answered ?? 0), 0);
  const withinSla = visible.reduce((s, q) => s + (q.withinSla ?? 0), 0);
  return toSLPct(withinSla, answered);
}

function extractSeries(history: HistoryPoint[], key: keyof HistoryPoint): number[] {
  return history.map((p) => Number(p[key]) || 0);
}

export function KpiGrid({ snapshot, selectedQueues }: { snapshot: WallboardSnapshot; selectedQueues: FilterSelection }) {
  const { kpis, history } = snapshot;
  const slPct = slForSelection(snapshot.queues, selectedQueues, kpis.serviceLevelPct);

  const items: Array<{ label: string; value: string; tone?: string; sparkData?: number[]; sparkColor?: string }> = [
    { label: "Offered", value: String(kpis.offered), sparkData: extractSeries(history, "offered"), sparkColor: "var(--accent)" },
    { label: "Answered", value: String(kpis.answered), sparkData: extractSeries(history, "answered"), sparkColor: "var(--ok)" },
    { label: "Abandoned", value: String(kpis.abandoned), sparkData: extractSeries(history, "abandoned"), sparkColor: "var(--bad)" },
    { label: "Service Level", value: `${slPct}%`, tone: slaClass(slPct), sparkData: extractSeries(history, "serviceLevelPct"), sparkColor: slPct >= 85 ? "var(--ok)" : slPct >= 70 ? "var(--warn)" : "var(--bad)" },
    { label: "ASA", value: formatDuration(kpis.asaSeconds) },
    { label: "AHT", value: formatDuration(kpis.ahtSeconds) },
  ];

  return (
    <section className="kpi-grid" aria-label="Key performance indicators">
      {items.map((item) => (
        <article key={item.label} className={`kpi ${item.tone ?? ""}`}>
          <div className="kpi-top">
            <span className="kpi-label">{item.label}</span>
            {item.sparkData && <Sparkline data={item.sparkData} color={item.sparkColor} className="kpi-spark" />}
          </div>
          <span className="kpi-value">{item.value}</span>
        </article>
      ))}
    </section>
  );
}
