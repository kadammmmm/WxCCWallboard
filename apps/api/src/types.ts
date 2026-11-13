export type ChannelType = "telephony" | "chat" | "email" | "social" | "other";

export interface Kpis {
  offered: number;
  answered: number;
  abandoned: number;
  serviceLevelPct: number;
  asaSeconds: number;
  ahtSeconds: number;
}

export interface QueueRow {
  id: string;
  name: string;
  channel: ChannelType;
  offered: number;
  answered: number;
  withinSla: number;
  inQueue: number;
  longestWaitSeconds: number;
  serviceLevelPct: number;
}

export type AgentAvailability =
  | "available"
  | "engaged"
  | "unavailable"
  | "wrapUp"
  | "loggedOut";

export interface AgentStateCounts {
  available: number;
  engaged: number;
  unavailable: number;
  wrapUp: number;
  loggedOut: number;
}

export interface AgentChannelStatus {
  channel: ChannelType;
  status: AgentAvailability;
  label: string;
}

export interface AgentStats {
  offered: number;
  handled: number;
  handlePct: number;
  ahtSeconds: number;
}

export interface AgentRow {
  id: string;
  name: string;
  team: string;
  status: AgentAvailability;
  stateSince?: number;
  channels: AgentChannelStatus[];
  stats?: AgentStats;
}

export interface ChannelMixItem {
  channel: ChannelType;
  count: number;
}

export interface StatsPeriod {
  from: number;
  to: number;
  timezone: string;
  resetAt: string;
  intervalHours: number;
  label: string;
}

export type AlertSeverity = "warn" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface HistoryPoint {
  timestamp: string;
  offered: number;
  answered: number;
  abandoned: number;
  serviceLevelPct: number;
  totalInQueue: number;
  agentsAvailable: number;
  agentsEngaged: number;
}

export interface IntervalBucket {
  time: string;
  label: string;
  offered: number;
  handled: number;
  abandoned: number;
  serviceLevelPct: number;
}

export interface WallboardSnapshot {
  title: string;
  logoUrl: string;
  watermark: string;
  generatedAt: string;
  stale: boolean;
  error?: string;
  mock: boolean;
  period: StatsPeriod;
  kpis: Kpis;
  queues: QueueRow[];
  agentStates: AgentStateCounts;
  agents: AgentRow[];
  channels: ChannelMixItem[];
  alerts: Alert[];
  history: HistoryPoint[];
  intervals: IntervalBucket[];
}

export interface HealthStatus {
  ok: boolean;
  mock: boolean;
  stale: boolean;
  lastSnapshotAt: string | null;
  tokenReady: boolean;
  uptime: number;
  connections: number;
  error?: string;
}
