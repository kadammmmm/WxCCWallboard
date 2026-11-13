import { config } from "../config.js";
import type { SearchClient } from "../graphql/searchClient.js";
import {
  agentStateQuery, channelMixQuery, queueStatsQuery, queueTotalsQuery, taskKpiQuery,
} from "../queries/wallboardQueries.js";
import type {
  AgentAvailability, AgentChannelStatus, AgentRow, AgentStateCounts,
  ChannelMixItem, ChannelType, Kpis, QueueRow, WallboardSnapshot,
} from "../types.js";
import { liveWindow, statsPeriod } from "../util/timeWindow.js";

interface Aggregation { name?: string; value?: number | string }
interface AggRow { name?: string; value?: number | string; key?: string; channelType?: string; channelSubType?: string }
interface TaskActivityNode { eventName?: string; createdTime?: number | string; isActive?: boolean; queueName?: string }
interface TaskNode {
  channelType?: string; channelSubType?: string; createdTime?: number | string;
  lastQueue?: { name?: string }; aggregation?: Aggregation | Aggregation[];
  activities?: { nodes?: TaskActivityNode | TaskActivityNode[] };
}
interface ActivityNode { startTime?: number | string; endTime?: number | string; duration?: number | string; state?: string; isCurrentActivity?: boolean }
interface ChannelInfo {
  currentState?: string; channelType?: string; subChannelType?: string;
  idleCodeName?: string; lastActivityTime?: number | string;
  activities?: { nodes?: ActivityNode | ActivityNode[] };
}
interface AgentNode { agentId?: string; agentName?: string; teamName?: string; channelInfo?: ChannelInfo | ChannelInfo[] }
interface PageInfo { hasNextPage?: boolean; endCursor?: string | null }

function num(v: unknown): number { const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? n : 0; }
function aggList(node: { aggregation?: Aggregation | Aggregation[] }): Aggregation[] { const a = node.aggregation; return !a ? [] : Array.isArray(a) ? a : [a]; }
function asList<T>(v: T | T[] | undefined): T[] { return !v ? [] : Array.isArray(v) ? v : [v]; }
function toEpochMs(v: unknown): number | undefined { const n = num(v); if (n <= 0) return undefined; return n < 1e12 ? n * 1000 : n; }

function flattenTaskAggs(tasks: TaskNode[] | undefined, keyOf: (t: TaskNode) => string | undefined): AggRow[] {
  const rows: AggRow[] = [];
  for (const t of tasks ?? []) {
    const key = keyOf(t);
    for (const a of aggList(t)) rows.push({ name: a.name, value: a.value, key, channelType: t.channelType, channelSubType: t.channelSubType });
  }
  return rows;
}

const CHANNEL_ORDER: ChannelType[] = ["telephony", "chat", "email", "social", "other"];
const STATE_PRIORITY: Record<AgentAvailability, number> = { engaged: 4, wrapUp: 3, available: 2, unavailable: 1, loggedOut: 0 };

function mapChannel(...parts: Array<string | undefined>): ChannelType {
  const c = parts.filter((p): p is string => Boolean(p?.trim())).join(" ").toLowerCase();
  if (!c) return "other";
  if (c.includes("email") || c.includes("mail")) return "email";
  if (c.includes("chat")) return "chat";
  if (c.includes("social") || c.includes("whatsapp") || c.includes("whats_app") || c.includes("facebook") || c.includes("messenger") || c.includes("twitter") || c.includes("sms") || c.includes("apple")) return "social";
  if (c.includes("tele") || c.includes("voice") || /(^|\s)phone(\s|$)/.test(c)) return "telephony";
  return "other";
}

function classifyChannelState(raw: string | undefined): AgentAvailability {
  const key = (raw || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (!key) return "unavailable";
  if (key.includes("connected") || key.includes("consult") || key.includes("conference") || key.includes("ringing") || key.includes("reserved")) return "engaged";
  if (key.includes("wrap")) return "wrapUp";
  if (key.includes("idle") || key.includes("not_ready") || key.includes("notready") || key.includes("unavailable")) return "unavailable";
  if (key.includes("avail") || key === "ready") return "available";
  if (key.includes("logout") || key.includes("logged_out") || key === "loggedout") return "loggedOut";
  return "unavailable";
}

function primaryState(states: AgentAvailability[]): AgentAvailability {
  if (states.length === 0) return "unavailable";
  return states.reduce((best, s) => STATE_PRIORITY[s] > STATE_PRIORITY[best] ? s : best);
}

function statusLabel(bucket: AgentAvailability, raw: string | undefined, idleCode: string | undefined): string {
  const code = idleCode?.trim();
  if (bucket === "unavailable" && code) return code;
  const key = (raw || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (key.includes("ringing")) return "Ringing";
  if (key.includes("consult")) return "Consulting";
  if (key.includes("conference")) return "Conference";
  if (key.includes("reserved")) return "Reserved";
  if (key.includes("connected")) return "Connected";
  if (key.includes("wrap")) return "Wrap-up";
  if (key.includes("idle")) return code || "Idle";
  if (key.includes("avail")) return "Available";
  if (bucket === "available") return "Available";
  if (bucket === "engaged") return "Connected";
  if (bucket === "wrapUp") return "Wrap-up";
  if (bucket === "loggedOut") return "Logged out";
  return "Unavailable";
}

function activityStartMs(node: ActivityNode): number | undefined {
  const s = toEpochMs(node.startTime), e = toEpochMs(node.endTime);
  if (s && e) return Math.min(s, e);
  return s ?? e;
}

function channelStateSince(ch: ChannelInfo, nowMs: number): number | undefined {
  const nodes = asList(ch.activities?.nodes);
  const current = nodes.find((n) => n.isCurrentActivity) ?? nodes.find((n) => !toEpochMs(n.endTime));
  if (current) {
    const start = activityStartMs(current);
    if (start) return start;
    const dur = num(current.duration);
    if (dur > 0) return nowMs - dur;
  }
  return toEpochMs(ch.lastActivityTime);
}

function statusSince(channels: Array<{ status: AgentAvailability; stateSince?: number }>, status: AgentAvailability): number | undefined {
  const times = channels.filter((c) => c.status === status).map((c) => c.stateSince).filter((v): v is number => typeof v === "number");
  return times.length === 0 ? undefined : Math.min(...times);
}

function channelsOf(s: AgentNode): ChannelInfo[] { const i = s.channelInfo; return !i ? [] : Array.isArray(i) ? i : [i]; }

function mapAgents(sessions: AgentNode[] | undefined): AgentRow[] {
  const nowMs = Date.now();
  const byId = new Map<string, { name: string; team: string; channels: Map<ChannelType, AgentChannelStatus & { stateSince?: number }> }>();

  for (const [index, session] of (sessions ?? []).entries()) {
    const id = session.agentId || `__row_${index}`;
    const team = session.teamName?.trim() || "Unassigned";
    let row = byId.get(id);
    if (!row) { row = { name: session.agentName?.trim() || "Unknown agent", team, channels: new Map() }; byId.set(id, row); }
    else {
      if (session.agentName?.trim() && row.name === "Unknown agent") row.name = session.agentName.trim();
      if (row.team === "Unassigned" && team !== "Unassigned") row.team = team;
    }
    for (const ch of channelsOf(session)) {
      const type = mapChannel(ch.channelType, ch.subChannelType);
      const status = classifyChannelState(ch.currentState);
      const next = { channel: type, status, label: statusLabel(status, ch.currentState, ch.idleCodeName), stateSince: channelStateSince(ch, nowMs) };
      const prev = row.channels.get(type);
      if (!prev || STATE_PRIORITY[status] > STATE_PRIORITY[prev.status]) row.channels.set(type, next);
    }
  }

  return [...byId.entries()].map(([id, row]) => {
    const channels = CHANNEL_ORDER.flatMap((t) => { const c = row.channels.get(t); return c ? [c] : []; });
    const status = primaryState(channels.map((c) => c.status));
    return { id, name: row.name, team: row.team, status, stateSince: statusSince(channels, status), channels: channels.map(({ stateSince: _, ...c }) => c) };
  }).sort((a, b) => { const d = STATE_PRIORITY[b.status] - STATE_PRIORITY[a.status]; return d !== 0 ? d : a.name.localeCompare(b.name); });
}

function mapAgentStates(agents: AgentRow[]): AgentStateCounts {
  const c: AgentStateCounts = { available: 0, engaged: 0, unavailable: 0, wrapUp: 0, loggedOut: 0 };
  for (const a of agents) c[a.status] += 1;
  return c;
}

function toServiceLevelPct(withinSla: number, answered: number): number {
  return answered <= 0 ? 0 : Math.min(100, Math.round((withinSla / answered) * 1000) / 10);
}

function parseKpis(rows: AggRow[]): Kpis {
  const m = Object.fromEntries(rows.filter((r) => r.name).map((r) => [r.name!, num(r.value)]));
  return {
    offered: m.offered ?? 0, answered: m.answered ?? 0, abandoned: m.abandoned ?? 0,
    serviceLevelPct: toServiceLevelPct(m.withinSla ?? 0, m.answered ?? 0),
    asaSeconds: Math.round(num(m.asa) / 1000), ahtSeconds: Math.round(num(m.aht) / 1000),
  };
}

function preferChannel(cur: ChannelType, next: ChannelType): ChannelType {
  const rank: Record<ChannelType, number> = { social: 4, chat: 3, email: 2, telephony: 1, other: 0 };
  return rank[next] > rank[cur] ? next : cur;
}

function parkedWaitSeconds(task: TaskNode, nowMs: number): number {
  const starts = asList(task.activities?.nodes).filter((n) => (n.eventName || "").toLowerCase() === "parked").map((n) => toEpochMs(n.createdTime)).filter((v): v is number => typeof v === "number");
  const start = starts.length > 0 ? Math.min(...starts) : toEpochMs(task.createdTime);
  return start ? Math.max(0, Math.round((nowMs - start) / 1000)) : 0;
}

function parseParkedQueues(tasks: TaskNode[] | undefined): QueueRow[] {
  type Acc = { name: string; channel: ChannelType; inQueue: number; longestWaitSeconds: number };
  const nowMs = Date.now();
  const byName = new Map<string, Acc>();
  for (const t of tasks ?? []) {
    const name = t.lastQueue?.name?.trim() || "Unknown";
    const ch = mapChannel(t.channelType, t.channelSubType, name);
    let acc = byName.get(name);
    if (!acc) { acc = { name, channel: ch, inQueue: 0, longestWaitSeconds: 0 }; byName.set(name, acc); }
    else acc.channel = preferChannel(acc.channel, ch);
    acc.inQueue += 1;
    acc.longestWaitSeconds = Math.max(acc.longestWaitSeconds, parkedWaitSeconds(t, nowMs));
  }
  return [...byName.values()].map((q) => ({ id: q.name, name: q.name, channel: q.channel, offered: 0, answered: 0, withinSla: 0, inQueue: q.inQueue, longestWaitSeconds: q.longestWaitSeconds, serviceLevelPct: 0 }));
}

function parseQueueTotals(rows: AggRow[]): QueueRow[] {
  type Acc = { name: string; channel: ChannelType; offered: number; answered: number; withinSla: number };
  const byName = new Map<string, Acc>();
  for (const r of rows) {
    const name = r.key?.trim();
    if (!name) continue;
    const ch = mapChannel(r.channelType, r.channelSubType, name);
    let acc = byName.get(name);
    if (!acc) { acc = { name, channel: ch, offered: 0, answered: 0, withinSla: 0 }; byName.set(name, acc); }
    else acc.channel = preferChannel(acc.channel, ch);
    if (r.name === "offered") acc.offered += num(r.value);
    if (r.name === "answered") acc.answered += num(r.value);
    if (r.name === "withinSla") acc.withinSla += num(r.value);
  }
  return [...byName.values()].map((q) => ({ id: q.name, name: q.name, channel: q.channel, offered: q.offered, answered: q.answered, withinSla: q.withinSla, inQueue: 0, longestWaitSeconds: 0, serviceLevelPct: toServiceLevelPct(q.withinSla, q.answered) }));
}

function mergeQueues(period: QueueRow[], parked: QueueRow[]): QueueRow[] {
  const byName = new Map<string, QueueRow>();
  for (const r of period) byName.set(r.name, { ...r });
  for (const r of parked) {
    const e = byName.get(r.name);
    if (e) { e.inQueue = r.inQueue; e.longestWaitSeconds = r.longestWaitSeconds; e.channel = preferChannel(e.channel, r.channel); }
    else byName.set(r.name, { ...r });
  }
  return [...byName.values()].sort((a, b) => b.inQueue !== a.inQueue ? b.inQueue - a.inQueue : b.offered !== a.offered ? b.offered - a.offered : a.name.localeCompare(b.name));
}

const PAGE_CAP = 20;

async function fetchParkedTasks(client: SearchClient, from: number, to: number): Promise<TaskNode[]> {
  const tasks: TaskNode[] = [];
  let cursor: string | undefined;
  for (let p = 0; p < PAGE_CAP; p++) {
    const data = await client.query<{ taskDetails: { tasks?: TaskNode[]; pageInfo?: PageInfo } }>(queueStatsQuery(from, to, cursor));
    tasks.push(...(data.taskDetails?.tasks ?? []));
    const info = data.taskDetails?.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return tasks;
}

async function fetchActiveAgentSessions(client: SearchClient, from: number, to: number): Promise<AgentNode[]> {
  const sessions: AgentNode[] = [];
  let cursor: string | undefined;
  for (let p = 0; p < PAGE_CAP; p++) {
    const data = await client.query<{ agentSession: { agentSessions?: AgentNode[]; pageInfo?: PageInfo } }>(agentStateQuery(from, to, cursor));
    sessions.push(...(data.agentSession?.agentSessions ?? []));
    const info = data.agentSession?.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return sessions;
}

function parseChannels(rows: AggRow[]): ChannelMixItem[] {
  const byType = new Map<ChannelType, number>();
  for (const r of rows) {
    if (r.name !== "byChannel" && !r.key) continue;
    const ch = mapChannel(r.key, r.channelType, r.channelSubType);
    byType.set(ch, (byType.get(ch) ?? 0) + num(r.value));
  }
  return CHANNEL_ORDER.flatMap((ch) => { const c = byType.get(ch); return c ? [{ channel: ch, count: c }] : []; });
}

export async function fetchLiveSnapshot(client: SearchClient): Promise<Omit<WallboardSnapshot, "stale" | "error" | "mock" | "alerts" | "history">> {
  const period = statsPeriod();
  const live = liveWindow();
  const [kpiData, channelData, queueTotals, parkedTasks, agentSessions] = await Promise.all([
    client.query<{ taskDetails: { tasks?: TaskNode[] } }>(taskKpiQuery(period.from, period.to)),
    client.query<{ taskDetails: { tasks?: TaskNode[] } }>(channelMixQuery(period.from, period.to)),
    client.query<{ taskDetails: { tasks?: TaskNode[] } }>(queueTotalsQuery(period.from, period.to)),
    fetchParkedTasks(client, live.from, live.to),
    fetchActiveAgentSessions(client, live.from, live.to),
  ]);
  const agents = mapAgents(agentSessions);
  return {
    title: config.wallboardTitle, logoUrl: config.wallboardLogoUrl, watermark: config.wallboardWatermark,
    generatedAt: new Date().toISOString(), period,
    kpis: parseKpis(flattenTaskAggs(kpiData.taskDetails?.tasks, () => undefined)),
    queues: mergeQueues(parseQueueTotals(flattenTaskAggs(queueTotals.taskDetails?.tasks, (t) => t.lastQueue?.name)), parseParkedQueues(parkedTasks)),
    agents, agentStates: mapAgentStates(agents),
    channels: parseChannels(flattenTaskAggs(channelData.taskDetails?.tasks, (t) => t.channelType)),
  };
}
