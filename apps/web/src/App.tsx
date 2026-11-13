import { useState } from "react";
import { useClock } from "./hooks/useClock";
import { useFilterSelection } from "./hooks/useFilterSelection";
import { useSocket } from "./hooks/useSocket";
import { useTheme } from "./hooks/useTheme";
import { useView } from "./hooks/useView";
import { Header } from "./components/Header";
import { ViewTabs } from "./components/ViewTabs";
import { OverviewView } from "./components/OverviewView";
import { AgentDetailView } from "./components/AgentDetailView";
import { QueuePerformanceView } from "./components/QueuePerformanceView";
import { SettingsPanel } from "./components/SettingsPanel";

export function App() {
  const { snapshot, connectionState } = useSocket();
  const { theme, toggle } = useTheme();
  const { view, navigate } = useView();
  const clock = useClock(snapshot?.period?.timezone);
  const [selectedTeams, setSelectedTeams] = useFilterSelection("wallboard.teams");
  const [selectedQueues, setSelectedQueues] = useFilterSelection("wallboard.queues");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [marqueeText, setMarqueeText] = useState(() => {
    try { return localStorage.getItem("wallboard.marquee") || "Welcome to the Contact Center Wallboard — Let our customers know how much we care."; } catch { return ""; }
  });

  function handleMarqueeChange(text: string) {
    setMarqueeText(text);
    try { localStorage.setItem("wallboard.marquee", text); } catch { /* ok */ }
  }

  if (!snapshot) {
    return (
      <div className="boot">
        <div className="boot-spinner" />
        <p>{connectionState === "disconnected" ? "Cannot connect to server..." : "Loading wallboard..."}</p>
      </div>
    );
  }

  const snapshotWithSettings = { ...snapshot, settings: { ...snapshot.settings, marqueeText, refreshInterval: 30, showTopPerformer: true } };

  return (
    <div className="wallboard">
      <Header snapshot={snapshot} clock={clock} connectionState={connectionState} theme={theme} onToggleTheme={toggle} onOpenSettings={() => setSettingsOpen(true)} />
      <ViewTabs active={view} onChange={navigate} />
      <div className="view-content">
        {view === "overview" && (
          <OverviewView snapshot={snapshotWithSettings} selectedTeams={selectedTeams} setSelectedTeams={setSelectedTeams} selectedQueues={selectedQueues} setSelectedQueues={setSelectedQueues} />
        )}
        {view === "agents" && (
          <AgentDetailView agents={snapshot.agents ?? []} selected={selectedTeams} onChange={setSelectedTeams} />
        )}
        {view === "queues" && (
          <QueuePerformanceView queues={snapshot.queues} kpis={snapshot.kpis} intervals={snapshot.intervals} selected={selectedQueues} onChange={setSelectedQueues} />
        )}
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} onToggleTheme={toggle} marqueeText={marqueeText} onMarqueeChange={handleMarqueeChange} />
    </div>
  );
}
