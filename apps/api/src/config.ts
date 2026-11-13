import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function int(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function hhmm(value: string | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(v) ? v : fallback;
}

export const config = {
  port: int(process.env.PORT, 3001),
  mockData: bool(process.env.MOCK_DATA, true),
  wallboardTitle: process.env.WALLBOARD_TITLE || "Contact Center Wallboard",
  wallboardLogoUrl: (process.env.WALLBOARD_LOGO_URL || "").trim(),
  wallboardWatermark: (process.env.WALLBOARD_WATERMARK || "").trim(),
  snapshotIntervalMs: int(process.env.SNAPSHOT_INTERVAL_MS, 30_000),
  displayKey: process.env.DISPLAY_KEY?.trim() || "",
  orgTimezone: process.env.ORG_TIMEZONE || "UTC",
  statsResetAt: hhmm(process.env.STATS_RESET_AT, "00:00"),
  statsIntervalHours: int(process.env.STATS_INTERVAL_HOURS, 24),
  liveLookbackHours: int(process.env.LIVE_LOOKBACK_HOURS, 168),
  historySize: int(process.env.HISTORY_SIZE, 60),
  alerts: {
    slaWarn: int(process.env.ALERT_SLA_WARN, 85),
    slaCritical: int(process.env.ALERT_SLA_CRITICAL, 70),
    queueDepthWarn: int(process.env.ALERT_QUEUE_DEPTH_WARN, 5),
    queueDepthCritical: int(process.env.ALERT_QUEUE_DEPTH_CRITICAL, 15),
    waitWarn: int(process.env.ALERT_WAIT_WARN, 120),
    waitCritical: int(process.env.ALERT_WAIT_CRITICAL, 300),
  },
  webex: {
    clientId: process.env.WEBEX_CLIENT_ID || "",
    clientSecret: process.env.WEBEX_CLIENT_SECRET || "",
    appId: process.env.WEBEX_APP_ID || "",
    orgId: process.env.WEBEX_ORG_ID || "",
    applicationsToken: process.env.WEBEX_APPLICATIONS_TOKEN || "",
    accessToken: process.env.WEBEX_ACCESS_TOKEN || "",
    refreshToken: process.env.WEBEX_REFRESH_TOKEN || "",
    apiBase: (process.env.WXCC_API_BASE || "").replace(/\/$/, ""),
    tokenUrl: "https://webexapis.com/v1/access_token",
    applicationsTokenUrl: "https://webexapis.com/v1/applications",
  },
};

export function assertLiveConfig(): void {
  const missing: string[] = [];
  if (!config.webex.clientId) missing.push("WEBEX_CLIENT_ID");
  if (!config.webex.clientSecret) missing.push("WEBEX_CLIENT_SECRET");
  if (!config.webex.appId) missing.push("WEBEX_APP_ID");
  if (!config.webex.orgId) missing.push("WEBEX_ORG_ID");
  if (!config.webex.apiBase) missing.push("WXCC_API_BASE");

  const canMint = Boolean(config.webex.applicationsToken);
  const hasLegacy = Boolean(config.webex.refreshToken || config.webex.accessToken);
  if (!canMint && !hasLegacy) missing.push("WEBEX_APPLICATIONS_TOKEN");

  if (missing.length) {
    throw new Error(`MOCK_DATA=false but missing required env: ${missing.join(", ")}`);
  }
}
