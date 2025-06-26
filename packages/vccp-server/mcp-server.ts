import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { setupMCPTools } from "./mcp-tools.js";
import type { SessionManager } from "./types.js";

export class VCCPMCPServer {
  private server: McpServer;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } =
    {};

  constructor(sessionManager: SessionManager) {
    this.server = new McpServer({
      name: "vccp",
      version: "1.0.0",
      capabilities: {
        resources: {},
        tools: {},
      },
    });

    setupMCPTools(this.server, sessionManager);
  }

  setupRoutes(app: express.Application): void {
    app.use(express.json());

    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && this.transports[sessionId]) {
        transport = this.transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            this.transports[sessionId] = transport;
            console.log(`MCP session initialized: ${sessionId}`);
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            console.log(`MCP session closed: ${transport.sessionId}`);
            delete this.transports[transport.sessionId];
          }
        };

        await this.server.connect(transport);
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    });

    const handleSessionRequest = async (
      req: express.Request,
      res: express.Response
    ) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !this.transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }

      const transport = this.transports[sessionId];
      await transport.handleRequest(req, res);
    };

    app.get("/mcp", handleSessionRequest);
    app.delete("/mcp", handleSessionRequest);
  }
}
