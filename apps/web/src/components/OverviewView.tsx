import { Gauge } from "./Gauge";
import { Marquee } from "./Marquee";
import { AlertBanner } from "./AlertBanner";
import { KpiGrid } from "./KpiGrid";
import { AgentStates } from "./AgentRoster";
import { QueueTable } from "./QueueTable";
import { ChannelMix } from "./ChannelMix";
import type { FilterSelection } from "../hooks/useFilterSelection";
import type { WallboardSnapshot } from "../types";

export function OverviewView({ snapshot, selectedTeams, setSelectedTeams, selectedQueues, setSelectedQueues }: {
  snapshot: WallboardSnapshot;
  selectedTeams: FilterSelection;
  setSelectedTeams: (next: FilterSelection) => void;
  selectedQueues: FilterSelection;
  setSelectedQueues: (next: FilterSelection) => void;
}) {
  const { kpis } = snapshot;
  const handlePct = kpis.offered > 0 ? Math.round((kpis.answered / kpis.offered) * 1000) / 10 : 0;
  const marqueeText = snapshot.settings?.marqueeText || "";

  return (
    <>
      <Marquee text={marqueeText} />
      <AlertBanner alerts={snapshot.alerts} />
      <div className="overview-top">
        <KpiGrid snapshot={snapshot} selectedQueues={selectedQueues} />
        <div className="overview-gauges">
          <Gauge value={kpis.serviceLevelPct} label="Service Level" size={110} thresholds={{ warn: 85, bad: 70 }} />
          <Gauge value={handlePct} label="Handle %" size={110} thresholds={{ warn: 85, bad: 70 }} />
        </div>
      </div>
      <div className="main-grid">
        <AgentStates agents={snapshot.agents ?? []} selected={selectedTeams} onChange={setSelectedTeams} history={snapshot.history ?? []} />
        <div className="side-stack">
          <QueueTable queues={snapshot.queues} selected={selectedQueues} onChange={setSelectedQueues} />
          <ChannelMix snapshot={snapshot} />
        </div>
      </div>
    </>
  );
}
