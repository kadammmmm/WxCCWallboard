import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server as SocketServer } from "socket.io";
import { TokenManager } from "./auth/tokenManager.js";
import { config } from "./config.js";
import { SnapshotService } from "./services/snapshotService.js";
import { log } from "./util/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireDisplayKey(req: Request, res: Response, next: NextFunction): void {
  if (!config.displayKey) { next(); return; }
  const header = req.header("x-display-key");
  const query = typeof req.query.key === "string" ? req.query.key : undefined;
  if (header === config.displayKey || query === config.displayKey) { next(); return; }
  res.status(401).json({ error: "Invalid or missing display key" });
}

async function main(): Promise<void> {
  const tokens = new TokenManager();
  const snapshots = new SnapshotService(tokens);

  const app = express();
  const server = http.createServer(app);

  const io = new SocketServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  }));
  app.use(cors());
  app.use(express.json());

  const apiLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
  app.use("/api", apiLimiter);

  app.get("/api/health", (_req, res) => {
    const health = snapshots.getHealth(io.engine.clientsCount);
    res.status(health.ok ? 200 : 503).json(health);
  });

  app.get("/api/snapshot", requireDisplayKey, (_req, res) => {
    res.json(snapshots.getSnapshot());
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      title: config.wallboardTitle,
      logoUrl: config.wallboardLogoUrl,
      watermark: config.wallboardWatermark,
      timezone: config.orgTimezone,
      mock: config.mockData,
      alerts: config.alerts,
    });
  });

  const webDist = path.resolve(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) { next(); return; }
    res.sendFile(path.join(webDist, "index.html"), (err) => { if (err) next(); });
  });

  app.use((_err: Error, _req: Request, res: Response, _next: NextFunction) => {
    log.error({ err: _err }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  });

  io.on("connection", (socket) => {
    log.debug({ id: socket.id }, "Client connected");
    socket.emit("snapshot", snapshots.getSnapshot());
    socket.on("disconnect", () => log.debug({ id: socket.id }, "Client disconnected"));
  });

  snapshots.setUpdateCallback((snapshot) => {
    io.emit("snapshot", snapshot);
  });

  snapshots.start();

  server.listen(config.port, () => {
    log.info({
      port: config.port, mock: config.mockData, interval: config.snapshotIntervalMs,
      timezone: config.orgTimezone, stats: `${config.statsResetAt}/${config.statsIntervalHours}h`,
    }, "Wallboard server started");
  });

  const shutdown = (signal: string) => {
    log.info({ signal }, "Shutting down");
    snapshots.stop();
    io.close();
    server.close(() => {
      log.info("Server closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  log.fatal({ err }, "Fatal startup error");
  process.exit(1);
});
