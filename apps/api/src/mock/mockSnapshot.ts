import type { AgentRow, ChannelType, IntervalBucket, QueueRow, WallboardSnapshot } from "../types.js";
import { config } from "../config.js";
import { statsPeriod } from "../util/timeWindow.js";

function mockQueue(id: string, name: string, channel: ChannelType, offered: number, slPct: number, inQueue: number, longestWait: number): QueueRow {
  const answered = Math.max(0, Math.round(offered * 0.9));
  const sl = Math.min(100, Math.max(0, slPct));
  const withinSla = Math.max(0, Math.round((answered * sl) / 100));
  return { id, name, channel, offered, answered, withinSla, inQueue: Math.max(0, inQueue), longestWaitSeconds: Math.max(0, longestWait), serviceLevelPct: answered > 0 ? Math.round((withinSla / answered) * 1000) / 10 : 0 };
}

function mockAgentStats(offered: number, handlePct: number, ahtSec: number) {
  const handled = Math.round(offered * handlePct / 100);
  return { offered, handled, handlePct: Math.round(handlePct * 10) / 10, ahtSeconds: ahtSec };
}

function generateIntervals(period: { from: number; to: number }): IntervalBucket[] {
  const buckets: IntervalBucket[] = [];
  const intervalMs = 30 * 60 * 1000;
  const now = Date.now();
  let t = period.from;
  while (t < Math.min(now, period.to)) {
    const d = new Date(t);
    const label = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const progress = (t - period.from) / (period.to - period.from);
    const base = 8 + Math.sin(progress * Math.PI) * 12;
    const offered = Math.max(1, Math.round(base + (Math.sin(t / 3600_000) * 4)));
    const handled = Math.max(0, Math.round(offered * (0.82 + Math.random() * 0.15)));
    const abandoned = Math.max(0, offered - handled);
    const sl = Math.min(100, Math.max(40, Math.round(75 + Math.sin(progress * Math.PI * 1.5) * 20 + (Math.random() - 0.5) * 10)));
    buckets.push({ time: d.toISOString(), label, offered, handled, abandoned, serviceLevelPct: sl });
    t += intervalMs;
  }
  return buckets;
}

export function buildMockSnapshot(): Omit<WallboardSnapshot, "alerts" | "history"> {
  const period = statsPeriod();
  const tick = Math.floor(Date.now() / 15_000);
  const wobble = (n: number, amp: number) => n + ((tick * 7) % (amp * 2)) - amp;
  const span = Math.max(period.intervalHours * 60 * 60 * 1000, 1);
  const frac = Math.min(1, Math.max(0, (period.to - period.from) / span));
  const grow = (n: number, amp: number) => Math.max(0, Math.round(wobble(n, amp) * frac));

  const agents: AgentRow[] = [
    { id: "mock-alex", name: "Alex Rivera", team: "Sales", status: "engaged", stateSince: Date.now() - 187_000, channels: [{ channel: "telephony", status: "engaged", label: "Connected" }, { channel: "chat", status: "available", label: "Available" }], stats: mockAgentStats(grow(18, 3), wobble(92, 4), wobble(290, 20)) },
    { id: "mock-jordan", name: "Jordan Lee", team: "Sales", status: "available", stateSince: Date.now() - 742_000, channels: [{ channel: "telephony", status: "available", label: "Available" }, { channel: "email", status: "available", label: "Available" }], stats: mockAgentStats(grow(12, 2), wobble(88, 5), wobble(310, 25)) },
    { id: "mock-sam", name: "Sam Patel", team: "Support", status: "wrapUp", stateSince: Date.now() - 46_000, channels: [{ channel: "telephony", status: "wrapUp", label: "Wrap-up" }, { channel: "chat", status: "available", label: "Available" }], stats: mockAgentStats(grow(21, 4), wobble(95, 3), wobble(260, 15)) },
    { id: "mock-riley", name: "Riley Chen", team: "Operations", status: "unavailable", stateSince: Date.now() - 512_000, channels: [{ channel: "telephony", status: "unavailable", label: "Break" }, { channel: "social", status: "unavailable", label: "Break" }], stats: mockAgentStats(grow(8, 2), wobble(85, 6), wobble(340, 30)) },
    { id: "mock-casey", name: "Casey Nguyen", team: "Support", status: "engaged", stateSince: Date.now() - 93_000, channels: [{ channel: "chat", status: "engaged", label: "Connected" }, { channel: "email", status: "available", label: "Available" }], stats: mockAgentStats(grow(25, 3), wobble(96, 2), wobble(240, 18)) },
    { id: "mock-morgan", name: "Morgan Davis", team: "Billing", status: "available", stateSince: Date.now() - 325_000, channels: [{ channel: "telephony", status: "available", label: "Available" }], stats: mockAgentStats(grow(15, 3), wobble(90, 4), wobble(305, 22)) },
    { id: "mock-taylor", name: "Taylor Kim", team: "Sales", status: "engaged", stateSince: Date.now() - 412_000, channels: [{ channel: "telephony", status: "engaged", label: "Connected" }, { channel: "chat", status: "engaged", label: "Connected" }], stats: mockAgentStats(grow(22, 4), wobble(93, 3), wobble(275, 20)) },
    { id: "mock-avery", name: "Avery Thompson", team: "Support", status: "unavailable", stateSince: Date.now() - 1200_000, channels: [{ channel: "telephony", status: "unavailable", label: "Lunch" }, { channel: "chat", status: "unavailable", label: "Lunch" }], stats: mockAgentStats(grow(10, 2), wobble(82, 7), wobble(350, 25)) },
    { id: "mock-dana", name: "Dana Martinez", team: "Billing", status: "engaged", stateSince: Date.now() - 156_000, channels: [{ channel: "telephony", status: "engaged", label: "Connected" }], stats: mockAgentStats(grow(19, 3), wobble(91, 4), wobble(285, 18)) },
    { id: "mock-chris", name: "Chris Park", team: "Support", status: "available", stateSince: Date.now() - 890_000, channels: [{ channel: "chat", status: "available", label: "Available" }, { channel: "email", status: "available", label: "Available" }], stats: mockAgentStats(grow(16, 3), wobble(87, 5), wobble(320, 22)) },
  ];

  return {
    title: config.wallboardTitle, logoUrl: config.wallboardLogoUrl, watermark: config.wallboardWatermark,
    generatedAt: new Date().toISOString(), stale: false, mock: true, period,
    kpis: {
      offered: grow(248, 8), answered: grow(221, 6), abandoned: grow(27, 3),
      serviceLevelPct: Math.min(99, Math.max(70, wobble(86, 4))),
      asaSeconds: Math.max(5, wobble(28, 5)), ahtSeconds: Math.max(60, wobble(312, 20)),
    },
    queues: [
      mockQueue("q-sales", "Sales", "telephony", grow(86, 4), wobble(88, 5), wobble(4, 2), wobble(95, 30)),
      mockQueue("q-support", "Support", "telephony", grow(102, 5), wobble(79, 6), wobble(7, 3), wobble(140, 40)),
      mockQueue("q-billing", "Billing", "telephony", grow(54, 3), wobble(91, 4), wobble(2, 1), wobble(60, 20)),
      mockQueue("q-chat", "Web Chat", "chat", grow(31, 3), wobble(92, 3), wobble(3, 2), wobble(45, 15)),
      mockQueue("q-email", "Email", "email", grow(18, 2), wobble(74, 5), wobble(12, 4), wobble(1800, 200)),
      mockQueue("q-whatsapp", "WhatsApp", "social", grow(11, 2), wobble(91, 4), wobble(2, 2), wobble(90, 25)),
    ],
    agents,
    agentStates: { available: 3, engaged: 4, unavailable: 2, wrapUp: 1, loggedOut: 0 },
    channels: [
      { channel: "telephony", count: grow(160, 10) },
      { channel: "chat", count: grow(45, 5) },
      { channel: "email", count: grow(30, 4) },
      { channel: "social", count: grow(31, 4) },
    ],
    intervals: generateIntervals(period),
  };
}
