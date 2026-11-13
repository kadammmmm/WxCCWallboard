import { formatDuration } from "../hooks/useClock";
import { applySelection, type FilterSelection } from "../hooks/useFilterSelection";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { Gauge } from "./Gauge";
import { SLTrendChart } from "./SLTrendChart";
import { IntervalChart } from "./IntervalChart";
import type { IntervalBucket, Kpis, QueueRow } from "../types";

function aggregate(queues: QueueRow[]): { offered: number; handled: number; abandoned: number; slPct: number; avgWait: number; avgLongest: number } {
  const offered = queues.reduce((s, q) => s + q.offered, 0);
  const handled = queues.reduce((s, q) => s + q.answered, 0);
  const abandoned = queues.reduce((s, q) => s + (q.offered - q.answered), 0);
  const withinSla = queues.reduce((s, q) => s + q.withinSla, 0);
  const slPct = handled > 0 ? Math.round((withinSla / handled) * 1000) / 10 : 0;
  const totalWait = queues.reduce((s, q) => s + q.longestWaitSeconds, 0);
  const avgWait = queues.length > 0 ? totalWait / queues.length : 0;
  const avgLongest = queues.length > 0 ? Math.max(...queues.map((q) => q.longestWaitSeconds)) : 0;
  return { offered, handled, abandoned, slPct, avgWait, avgLongest };
}

export function QueuePerformanceView({ queues, kpis, intervals, selected, onChange }: {
  queues: QueueRow[];
  kpis: Kpis;
  intervals?: IntervalBucket[];
  selected: FilterSelection;
  onChange: (next: FilterSelection) => void;
}) {
  const options = queues.map((q) => ({ value: q.id, label: q.name }));
  const visible = applySelection(queues, selected, (q) => q.id);
  const agg = aggregate(visible);
  const handlePct = agg.offered > 0 ? Math.round((agg.handled / agg.offered) * 1000) / 10 : 0;

  const kpiCards = [
    { label: "Tasks", value: String(agg.offered) },
    { label: "Handled", value: String(agg.handled) },
    { label: "Abandoned", value: String(agg.abandoned), tone: agg.abandoned > 0 ? "bad" : "" },
    { label: "Avg Wait Duration", value: formatDuration(Math.round(agg.avgWait)) },
    { label: "Longest Wait", value: formatDuration(Math.round(agg.avgLongest)), tone: agg.avgLongest > 120 ? "bad" : "" },
    { label: "AHT", value: formatDuration(kpis.ahtSeconds) },
  ];

  return (
    <div className="queue-perf-view">
      <div className="queue-perf-header">
        <div className="queue-perf-filters">
          <MultiSelectFilter label="Queues" noun="queues" options={options} selected={selected} onChange={onChange} />
        </div>
      </div>

      <div className="queue-perf-top">
        <div className="queue-perf-kpis">
          {kpiCards.map((k) => (
            <div key={k.label} className={`qp-kpi ${k.tone ?? ""}`}>
              <span className="qp-kpi-value">{k.value}</span>
              <span className="qp-kpi-label">{k.label}</span>
            </div>
          ))}
        </div>
        <div className="queue-perf-gauges">
          <Gauge value={agg.slPct} label="Service Level" size={120} thresholds={{ warn: 85, bad: 70 }} />
          <Gauge value={handlePct} label="Handle %" size={120} thresholds={{ warn: 85, bad: 70 }} />
        </div>
      </div>

      {intervals && intervals.length > 0 && (
        <div className="queue-perf-charts">
          <SLTrendChart data={intervals} />
          <IntervalChart data={intervals} />
        </div>
      )}

      <div className="queue-perf-table">
        <h3 className="chart-title">Queue Breakdown</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Queue</th>
                <th>Channel</th>
                <th className="num">Offered</th>
                <th className="num">Answered</th>
                <th className="num">In Queue</th>
                <th className="num">Longest Wait</th>
                <th className="num">SL%</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((q) => (
                <tr key={q.id}>
                  <td className="queue-name">{q.name}</td>
                  <td><span className={`channel-tag channel-${q.channel}`}>{channelLabel(q.channel)}</span></td>
                  <td className="num">{q.offered}</td>
                  <td className="num">{q.answered}</td>
                  <td className={`num ${q.inQueue > 5 ? "warn" : ""}`}>{q.inQueue}</td>
                  <td className={`num ${q.longestWaitSeconds > 120 ? "bad" : ""}`}>{formatDuration(q.longestWaitSeconds)}</td>
                  <td className={`num ${q.serviceLevelPct >= 85 ? "ok" : q.serviceLevelPct >= 70 ? "warn" : "bad"}`}>{q.serviceLevelPct > 0 ? `${q.serviceLevelPct}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function channelLabel(c: string): string {
  const map: Record<string, string> = { telephony: "Voice", chat: "Chat", email: "Email", social: "Social", other: "Other" };
  return map[c] || "Other";
}
