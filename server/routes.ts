import type { Express } from "express";
import { createServer, type Server } from "node:http";

function isReadyForTraffic(): boolean {
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health/live", (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/health/ready", (_req, res) => {
    const ready = isReadyForTraffic();
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
