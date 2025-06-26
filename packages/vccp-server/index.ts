import express from "express";
import expressWs from "express-ws";
import { VCCPWebSocketServer } from "./server.js";
import { VCCPMCPServer } from "./mcp-server.js";
import type { VCCPServerConfig } from "./types.js";

export class VCCPServer {
  private app: express.Application;
  private wsApp: expressWs.Application;
  private webSocketServer: VCCPWebSocketServer;
  private mcpServer: VCCPMCPServer;
  private config: VCCPServerConfig;

  constructor(config: VCCPServerConfig) {
    this.config = {
      port: config.port,
      host: config.host,
    };

    this.app = express();
    const wsInstance = expressWs(this.app);
    this.wsApp = wsInstance.app;

    this.webSocketServer = new VCCPWebSocketServer();
    this.mcpServer = new VCCPMCPServer(this.webSocketServer);

    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.webSocketServer.setupWebSocketRoutes(this.wsApp);
    this.mcpServer.setupRoutes(this.wsApp);
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.wsApp.listen(this.config.port, () => {
        console.log(`VCCP Server started on port ${this.config.port}`);
        console.log(
          `WebSocket endpoint available at ws://${this.config.host}:${this.config.port}/vccp`
        );
        resolve();
      });
    });
  }

  getWebSocketServer(): VCCPWebSocketServer {
    return this.webSocketServer;
  }

  getMCPServer(): VCCPMCPServer {
    return this.mcpServer;
  }
}

// Re-export types and classes for library users
export { VCCPWebSocketServer } from "./server.js";
export { VCCPMCPServer } from "./mcp-server.js";
export * from "./types.js";
