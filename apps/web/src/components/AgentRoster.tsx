import { useRef, type CSSProperties } from "react";
import { formatDuration, useNow } from "../hooks/useClock";
import { applySelection, type FilterSelection } from "../hooks/useFilterSelection";
import { MultiSelectFilter } from "./MultiSelectFilter";
import type { AgentAvailability, AgentRow, AgentStateCounts, ChannelType } from "../types";
import { Sparkline } from "./Sparkline";
import type { HistoryPoint } from "../types";
import { useRosterLayout } from "../hooks/useRosterLayout";

function channelLabel(c: ChannelType): string {
  const map: Record<ChannelType, string> = { telephony: "Voice", chat: "Chat", email: "Email", social: "Social", other: "Other" };
  return map[c] || "Other";
}

function availabilityTone(s: AgentAvailability): string {
  const map: Record<AgentAvailability, string> = { available: "ok", engaged: "engaged", wrapUp: "warn", unavailable: "warn", loggedOut: "" };
  return map[s] || "";
}

function availabilityLabel(s: AgentAvailability): string {
  const map: Record<AgentAvailability, string> = { available: "Available", engaged: "Engaged", wrapUp: "Wrap-up", unavailable: "Unavailable", loggedOut: "Logged out" };
  return map[s];
}

function countStates(agents: AgentRow[]): AgentStateCounts {
  const c: AgentStateCounts = { available: 0, engaged: 0, unavailable: 0, wrapUp: 0, loggedOut: 0 };
  for (const a of agents) c[a.status] += 1;
  return c;
}

function AgentCards({ agents, emptyLabel }: { agents: AgentRow[]; emptyLabel: string }) {
  const now = useNow();
  const rosterRef = useRef<HTMLUListElement>(null);
  const layout = useRosterLayout(rosterRef, agents.length);

  if (agents.length === 0) return <p className="empty-agents">{emptyLabel}</p>;

  return (
    <ul ref={rosterRef} className={`agent-roster density-${layout.density}`} style={{ "--agent-cols": String(layout.cols), "--agent-scale": String(layout.scale) } as CSSProperties}>
      {agents.map((agent) => {
        const elapsed = agent.stateSince != null ? Math.max(0, Math.floor((now - agent.stateSince) / 1000)) : undefined;
        return (
          <li key={agent.id} className="agent-card">
            <div className="agent-card-head">
              <div className="agent-identity">
                <span className="agent-name-line">
                  <span className="agent-name">{agent.name}</span>
                  {elapsed != null && <span className="agent-timer">{formatDuration(elapsed)}</span>}
                </span>
                <span className="agent-team">{agent.team}</span>
              </div>
              <span className={`agent-primary ${availabilityTone(agent.status)}`}>{availabilityLabel(agent.status)}</span>
            </div>
            <div className="agent-channels">
              {agent.channels.length === 0 ? <span className="channel-pill">No channels</span> : agent.channels.map((ch) => (
                <span key={ch.channel} className={`channel-pill ${availabilityTone(ch.status)}`}>
                  <span className={`channel-dot channel-${ch.channel}`} />
                  <span className="channel-name">{channelLabel(ch.channel)}</span>
                  <span className="channel-status">{ch.label}</span>
                </span>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AgentStates({ agents, selected, onChange, history }: {
  agents: AgentRow[]; selected: FilterSelection; onChange: (next: FilterSelection) => void; history: HistoryPoint[];
}) {
  const options = [...new Set(agents.map((a) => a.team).filter(Boolean))].sort().map((t) => ({ value: t, label: t }));
  const visible = applySelection(agents, selected, (a) => a.team);
  const a = countStates(visible);

  const rows = [
    { label: "Available", value: a.available, tone: "ok", sparkData: history.map((p) => p.agentsAvailable) },
    { label: "Engaged", value: a.engaged, tone: "engaged", sparkData: history.map((p) => p.agentsEngaged) },
    { label: "Wrap-up", value: a.wrapUp, tone: "warn", sparkData: [] as number[] },
    { label: "Unavailable", value: a.unavailable, tone: "warn", sparkData: [] as number[] },
  ];

  return (
    <section className="panel agent-panel" aria-label="Agent states">
      <div className="panel-head">
        <h2>Agents</h2>
        <MultiSelectFilter label="Teams" noun="teams" options={options} selected={selected} onChange={onChange} />
      </div>
      <div className="agent-grid">
        {rows.map((r) => (
          <div key={r.label} className={`agent-cell ${r.tone}`}>
            <div className="agent-cell-top">
              <span className="agent-value">{r.value}</span>
              {r.sparkData.length > 1 && <Sparkline data={r.sparkData} width={50} height={20} color={`var(--${r.tone === "engaged" ? "accent" : r.tone})`} />}
            </div>
            <span className="agent-label">{r.label}</span>
          </div>
        ))}
      </div>
      <AgentCards agents={visible} emptyLabel={agents.length === 0 ? "No agents signed in" : "No agents selected"} />
    </section>
  );
}
