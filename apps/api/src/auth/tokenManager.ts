import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { log } from "../util/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokenStorePath = path.resolve(__dirname, "../data/tokens.json");

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export class TokenManager {
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private inflight: Promise<string> | null = null;

  constructor() {
    const stored = this.readStore();
    this.accessToken = stored?.accessToken || config.webex.accessToken;
    this.refreshToken = stored?.refreshToken || config.webex.refreshToken;
    this.expiresAt = stored?.expiresAt || 0;
  }

  get ready(): boolean {
    return Boolean(
      this.accessToken ||
        this.refreshToken ||
        (config.webex.appId &&
          config.webex.clientId &&
          config.webex.clientSecret &&
          config.webex.orgId &&
          config.webex.applicationsToken),
    );
  }

  async getAccessToken(): Promise<string> {
    if (this.inflight) return this.inflight;
    this.inflight = this.resolveAccessToken().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  async refresh(): Promise<string> {
    if (this.inflight) return this.inflight;
    this.inflight = this.forceRenew().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async resolveAccessToken(): Promise<string> {
    const skewMs = 5 * 60 * 1000;
    if (this.accessToken && this.expiresAt && Date.now() < this.expiresAt - skewMs) {
      return this.accessToken;
    }
    if (this.refreshToken) {
      try {
        return await this.doRefresh();
      } catch (err) {
        log.warn({ err }, "Refresh failed, attempting re-mint");
      }
    }
    return this.mintFromServiceApp();
  }

  private async forceRenew(): Promise<string> {
    if (this.refreshToken) {
      try {
        return await this.doRefresh();
      } catch (err) {
        log.warn({ err }, "Forced refresh failed, attempting re-mint");
      }
    }
    return this.mintFromServiceApp();
  }

  private async mintFromServiceApp(): Promise<string> {
    const { appId, clientId, clientSecret, orgId, applicationsToken, applicationsTokenUrl } =
      config.webex;

    if (!appId || !clientId || !clientSecret || !orgId) {
      throw new Error("Cannot mint: need WEBEX_APP_ID, WEBEX_CLIENT_ID, WEBEX_CLIENT_SECRET, WEBEX_ORG_ID");
    }
    if (!applicationsToken) {
      throw new Error("Cannot mint: set WEBEX_APPLICATIONS_TOKEN");
    }

    const url = `${applicationsTokenUrl}/${encodeURIComponent(appId)}/token`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${applicationsToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ clientId, clientSecret, targetOrgId: orgId }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mint failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as TokenResponse;
    this.applyTokenResponse(data);
    log.info("Minted Service App tokens");
    return this.accessToken;
  }

  private async doRefresh(): Promise<string> {
    if (!this.refreshToken) throw new Error("No refresh token");
    if (!config.webex.clientId || !config.webex.clientSecret) {
      throw new Error("WEBEX_CLIENT_ID and WEBEX_CLIENT_SECRET required");
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.webex.clientId,
      client_secret: config.webex.clientSecret,
      refresh_token: this.refreshToken,
    });

    const res = await fetch(config.webex.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Refresh failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as TokenResponse;
    this.applyTokenResponse(data);
    log.info("Refreshed Service App token");
    return this.accessToken;
  }

  private applyTokenResponse(data: TokenResponse): void {
    if (!data.access_token) throw new Error("Response missing access_token");
    this.accessToken = data.access_token;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
    const expiresInSec = data.expires_in ?? 14 * 24 * 60 * 60;
    this.expiresAt = Date.now() + expiresInSec * 1000;
    this.writeStore();
  }

  private readStore(): StoredTokens | null {
    try {
      if (!fs.existsSync(tokenStorePath)) return null;
      return JSON.parse(fs.readFileSync(tokenStorePath, "utf8")) as StoredTokens;
    } catch {
      return null;
    }
  }

  private writeStore(): void {
    try {
      const dir = path.dirname(tokenStorePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        tokenStorePath,
        JSON.stringify(
          { accessToken: this.accessToken, refreshToken: this.refreshToken, expiresAt: this.expiresAt },
          null,
          2,
        ),
        { mode: 0o600 },
      );
    } catch (err) {
      log.warn({ err }, "Could not persist tokens");
    }
  }
}
