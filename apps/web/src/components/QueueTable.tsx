import { formatDuration } from "../hooks/useClock";
import { applySelection, type FilterSelection } from "../hooks/useFilterSelection";
import { MultiSelectFilter } from "./MultiSelectFilter";
import type { ChannelType, QueueRow } from "../types";

function channelLabel(c: ChannelType): string {
  const map: Record<ChannelType, string> = { telephony: "Voice", chat: "Chat", email: "Email", social: "Social", other: "Other" };
  return map[c] || "Other";
}

function slaClass(pct: number): string {
  if (pct >= 85) return "ok";
  if (pct >= 70) return "warn";
  return "bad";
}

export function QueueTable({ queues, selected, onChange }: {
  queues: QueueRow[];
  selected: FilterSelection;
  onChange: (next: FilterSelection) => void;
}) {
  const options = queues.map((q) => ({ value: q.id, label: q.name }));
  const visible = applySelection(queues, selected, (q) => q.id);

  return (
    <section className="panel queue-panel" aria-label="Queues">
      <div className="panel-head">
        <h2>Queues</h2>
        <MultiSelectFilter label="Queues" noun="queues" options={options} selected={selected} onChange={onChange} />
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Queue</th>
              <th>Channel</th>
              <th>Offered</th>
              <th>In Queue</th>
              <th>Longest Wait</th>
              <th>SL%</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={6} className="empty">{queues.length === 0 ? "No queue activity" : "No queues selected"}</td></tr>
            ) : visible.map((q) => (
              <tr key={q.id}>
                <td className="queue-name">{q.name}</td>
                <td><span className={`channel-tag channel-${q.channel}`}>{channelLabel(q.channel)}</span></td>
                <td>{q.offered}</td>
                <td className={q.inQueue > 5 ? "warn" : ""}>{q.inQueue}</td>
                <td className={q.longestWaitSeconds > 120 ? "bad" : ""}>{formatDuration(q.longestWaitSeconds)}</td>
                <td className={slaClass(q.serviceLevelPct)}>{q.serviceLevelPct > 0 ? `${q.serviceLevelPct}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
