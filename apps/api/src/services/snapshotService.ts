import type { TokenManager } from "../auth/tokenManager.js";
import { config, assertLiveConfig } from "../config.js";
import { SearchClient } from "../graphql/searchClient.js";
import { buildMockSnapshot } from "../mock/mockSnapshot.js";
import type { HealthStatus, WallboardSnapshot } from "../types.js";
import { emptyKpis, statsPeriod } from "../util/timeWindow.js";
import { log } from "../util/logger.js";
import { fetchLiveSnapshot } from "./liveSnapshot.js";
import { HistoryService } from "./historyService.js";
import { evaluateAlerts } from "./alertService.js";

function formatError(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let i = 0; i < 4 && current; i++) {
    if (current instanceof Error) {
      if (current.message) parts.push(current.message);
      const code = (current as Error & { code?: string }).code;
      if (code) parts.push(`code=${code}`);
      current = current.cause;
    } else { parts.push(String(current)); break; }
  }
  return parts.join(" | ") || "Unknown snapshot error";
}

export class SnapshotService {
  private snapshot: WallboardSnapshot;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inflight: Promise<void> | null = null;
  private lastError?: string;
  private readonly search: SearchClient | null;
  private readonly history: HistoryService;
  private onUpdate?: (snapshot: WallboardSnapshot) => void;

  constructor(private readonly tokens: TokenManager) {
    this.search = config.mockData ? null : new SearchClient(tokens);
    this.history = new HistoryService(config.historySize);
    const base = buildMockSnapshot();
    if (config.mockData) {
      this.snapshot = { ...base, alerts: evaluateAlerts(base), history: [] };
    } else {
      assertLiveConfig();
      this.snapshot = {
        ...base, mock: false, stale: true, error: "Waiting for first live poll",
        period: statsPeriod(), kpis: emptyKpis(), queues: [], agents: [],
        agentStates: { available: 0, engaged: 0, unavailable: 0, wrapUp: 0, loggedOut: 0 },
        channels: [], alerts: [], history: [], intervals: [],
      };
    }
  }

  setUpdateCallback(cb: (snapshot: WallboardSnapshot) => void): void {
    this.onUpdate = cb;
  }

  getSnapshot(): WallboardSnapshot {
    return this.snapshot;
  }

  getHealth(connectionCount: number): HealthStatus {
    return {
      ok: !this.snapshot.stale || config.mockData,
      mock: config.mockData, stale: this.snapshot.stale,
      lastSnapshotAt: this.snapshot.generatedAt,
      tokenReady: config.mockData || this.tokens.ready,
      uptime: process.uptime(),
      connections: connectionCount,
      error: this.lastError,
    };
  }

  start(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), config.snapshotIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async refresh(): Promise<void> {
    if (this.inflight) return this.inflight;
    this.inflight = this.poll().finally(() => { this.inflight = null; });
    return this.inflight;
  }

  private async poll(): Promise<void> {
    if (config.mockData) {
      const base = buildMockSnapshot();
      this.history.push(base);
      this.snapshot = { ...base, alerts: evaluateAlerts(base), history: this.history.getHistory() };
      this.lastError = undefined;
      this.onUpdate?.(this.snapshot);
      return;
    }
    try {
      if (!this.search) throw new Error("Search client not initialized");
      const live = await fetchLiveSnapshot(this.search);
      this.history.push(live);
      this.snapshot = { ...live, stale: false, mock: false, alerts: evaluateAlerts(live), history: this.history.getHistory() };
      this.lastError = undefined;
      this.onUpdate?.(this.snapshot);
    } catch (err) {
      const message = formatError(err);
      this.lastError = message;
      log.error({ err }, "Snapshot poll failed");
      const period = statsPeriod();
      const rolled = this.snapshot.period.from !== period.from;
      this.snapshot = {
        ...this.snapshot, generatedAt: new Date().toISOString(), stale: true, mock: false, error: message, period,
        ...(rolled ? { kpis: emptyKpis(), channels: [] } : {}),
        alerts: [], history: this.history.getHistory(),
      };
      this.onUpdate?.(this.snapshot);
    }
  }
}
