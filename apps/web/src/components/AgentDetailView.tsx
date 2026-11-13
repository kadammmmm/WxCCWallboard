import { formatDuration, useNow } from "../hooks/useClock";
import { applySelection, type FilterSelection } from "../hooks/useFilterSelection";
import { MultiSelectFilter } from "./MultiSelectFilter";
import type { AgentAvailability, AgentRow, AgentStateCounts } from "../types";

function availabilityLabel(s: AgentAvailability): string {
  const map: Record<AgentAvailability, string> = { available: "Available", engaged: "Engaged", wrapUp: "Wrap-up", unavailable: "Unavailable", loggedOut: "Logged out" };
  return map[s];
}

function statusTone(s: AgentAvailability): string {
  const map: Record<AgentAvailability, string> = { available: "ok", engaged: "engaged", wrapUp: "warn", unavailable: "warn", loggedOut: "" };
  return map[s] || "";
}

function countStates(agents: AgentRow[]): AgentStateCounts {
  const c: AgentStateCounts = { available: 0, engaged: 0, unavailable: 0, wrapUp: 0, loggedOut: 0 };
  for (const a of agents) c[a.status] += 1;
  return c;
}

function AgentTable({ agents }: { agents: AgentRow[] }) {
  const now = useNow();

  if (agents.length === 0) return <p className="empty-agents">No agents match filter</p>;

  const sorted = [...agents].sort((a, b) => {
    const order: Record<AgentAvailability, number> = { engaged: 0, available: 1, wrapUp: 2, unavailable: 3, loggedOut: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  return (
    <div className="table-scroll agent-detail-table">
      <table>
        <thead>
          <tr>
            <th>Agent</th>
            <th>Team</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Duration</th>
            <th className="num">Offered</th>
            <th className="num">Handled</th>
            <th className="num">Handle%</th>
            <th className="num">AHT</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const elapsed = a.stateSince != null ? Math.max(0, Math.floor((now - a.stateSince) / 1000)) : 0;
            const reason = a.channels.length > 0 ? a.channels[0].label : "—";
            const stats = a.stats;
            return (
              <tr key={a.id} className={`agent-row-${statusTone(a.status)}`}>
                <td className="agent-detail-name">{a.name}</td>
                <td>{a.team}</td>
                <td><span className={`status-badge ${statusTone(a.status)}`}>{availabilityLabel(a.status)}</span></td>
                <td className="reason-cell">{reason}</td>
                <td className="mono">{formatDuration(elapsed)}</td>
                <td className="num">{stats?.offered ?? "—"}</td>
                <td className="num">{stats?.handled ?? "—"}</td>
                <td className={`num ${stats ? (stats.handlePct >= 90 ? "ok" : stats.handlePct >= 70 ? "warn" : "bad") : ""}`}>
                  {stats ? `${stats.handlePct.toFixed(1)}%` : "—"}
                </td>
                <td className="num mono">{stats ? formatDuration(stats.ahtSeconds) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AgentDetailView({ agents, selected, onChange }: {
  agents: AgentRow[];
  selected: FilterSelection;
  onChange: (next: FilterSelection) => void;
}) {
  const options = [...new Set(agents.map((a) => a.team).filter(Boolean))].sort().map((t) => ({ value: t, label: t }));
  const visible = applySelection(agents, selected, (a) => a.team);
  const counts = countStates(visible);

  const summary = [
    { label: "Logged In", value: visible.length, tone: "" },
    { label: "Ready", value: counts.available, tone: "ok" },
    { label: "Talking", value: counts.engaged, tone: "engaged" },
    { label: "Not Ready", value: counts.unavailable + counts.wrapUp, tone: "warn" },
  ];

  const topPerformer = visible.reduce<AgentRow | null>((best, a) => {
    if (!a.stats) return best;
    if (!best?.stats) return a;
    return a.stats.handled > best.stats.handled ? a : best;
  }, null);

  return (
    <div className="agent-detail-view">
      <div className="agent-detail-header">
        <div className="agent-summary-boxes">
          {summary.map((s) => (
            <div key={s.label} className={`summary-box ${s.tone}`}>
              <span className="summary-value">{s.value}</span>
              <span className="summary-label">{s.label}</span>
            </div>
          ))}
        </div>
        <MultiSelectFilter label="Teams" noun="teams" options={options} selected={selected} onChange={onChange} />
      </div>
      {topPerformer?.stats && (
        <div className="top-performer">
          <div className="top-performer-badge">Top Performer</div>
          <div className="top-performer-info">
            <span className="top-performer-name">{topPerformer.name}</span>
            <span className="top-performer-team">{topPerformer.team}</span>
          </div>
          <div className="top-performer-stats">
            <span className="tp-stat"><span className="tp-stat-label">Offered</span><span className="tp-stat-value">{topPerformer.stats.offered}</span></span>
            <span className="tp-stat"><span className="tp-stat-label">Handled</span><span className="tp-stat-value">{topPerformer.stats.handled}</span></span>
            <span className="tp-stat"><span className="tp-stat-label">Handle%</span><span className="tp-stat-value ok">{topPerformer.stats.handlePct.toFixed(1)}%</span></span>
          </div>
        </div>
      )}
      <AgentTable agents={visible} />
    </div>
  );
}
