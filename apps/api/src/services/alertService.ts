import { config } from "../config.js";
import type { Alert, WallboardSnapshot } from "../types.js";

export function evaluateAlerts(snapshot: Pick<WallboardSnapshot, "kpis" | "queues">): Alert[] {
  const alerts: Alert[] = [];
  const { alerts: thresholds } = config;

  if (snapshot.kpis.serviceLevelPct > 0 && snapshot.kpis.serviceLevelPct < thresholds.slaCritical) {
    alerts.push({ id: "sla-critical", severity: "critical", message: `Service level at ${snapshot.kpis.serviceLevelPct}% (below ${thresholds.slaCritical}%)`, metric: "serviceLevelPct", value: snapshot.kpis.serviceLevelPct, threshold: thresholds.slaCritical });
  } else if (snapshot.kpis.serviceLevelPct > 0 && snapshot.kpis.serviceLevelPct < thresholds.slaWarn) {
    alerts.push({ id: "sla-warn", severity: "warn", message: `Service level at ${snapshot.kpis.serviceLevelPct}% (below ${thresholds.slaWarn}%)`, metric: "serviceLevelPct", value: snapshot.kpis.serviceLevelPct, threshold: thresholds.slaWarn });
  }

  for (const q of snapshot.queues) {
    if (q.inQueue >= thresholds.queueDepthCritical) {
      alerts.push({ id: `queue-depth-critical-${q.id}`, severity: "critical", message: `${q.name}: ${q.inQueue} contacts waiting`, metric: "queueDepth", value: q.inQueue, threshold: thresholds.queueDepthCritical });
    } else if (q.inQueue >= thresholds.queueDepthWarn) {
      alerts.push({ id: `queue-depth-warn-${q.id}`, severity: "warn", message: `${q.name}: ${q.inQueue} contacts waiting`, metric: "queueDepth", value: q.inQueue, threshold: thresholds.queueDepthWarn });
    }

    if (q.longestWaitSeconds >= thresholds.waitCritical) {
      alerts.push({ id: `wait-critical-${q.id}`, severity: "critical", message: `${q.name}: longest wait ${Math.floor(q.longestWaitSeconds / 60)}m ${q.longestWaitSeconds % 60}s`, metric: "longestWait", value: q.longestWaitSeconds, threshold: thresholds.waitCritical });
    } else if (q.longestWaitSeconds >= thresholds.waitWarn) {
      alerts.push({ id: `wait-warn-${q.id}`, severity: "warn", message: `${q.name}: longest wait ${Math.floor(q.longestWaitSeconds / 60)}m ${q.longestWaitSeconds % 60}s`, metric: "longestWait", value: q.longestWaitSeconds, threshold: thresholds.waitWarn });
    }
  }

  return alerts;
}
