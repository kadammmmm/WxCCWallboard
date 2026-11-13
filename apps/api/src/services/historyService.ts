import type { HistoryPoint, WallboardSnapshot } from "../types.js";

export class HistoryService {
  private readonly buffer: HistoryPoint[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(snapshot: Omit<WallboardSnapshot, "alerts" | "history">): void {
    const point: HistoryPoint = {
      timestamp: snapshot.generatedAt,
      offered: snapshot.kpis.offered,
      answered: snapshot.kpis.answered,
      abandoned: snapshot.kpis.abandoned,
      serviceLevelPct: snapshot.kpis.serviceLevelPct,
      totalInQueue: snapshot.queues.reduce((s, q) => s + q.inQueue, 0),
      agentsAvailable: snapshot.agentStates.available,
      agentsEngaged: snapshot.agentStates.engaged,
    };
    this.buffer.push(point);
    if (this.buffer.length > this.maxSize) this.buffer.shift();
  }

  getHistory(): HistoryPoint[] {
    return [...this.buffer];
  }
}
