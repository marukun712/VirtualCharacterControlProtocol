import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type Agent, type VCCPMessage, VCCPMessageSchema } from "./types.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import expressWs from "express-ws";
import type { WebSocket } from "ws";

class VCCPServer {
  private connectedClients: Set<WebSocket> = new Set();

  private agents: Map<string, Agent | null> = new Map();
  private sessions: Map<WebSocket, string> = new Map();

  setupWebSocketRoutes(app: expressWs.Application): void {
    app.ws("/vccp/:id", (ws: WebSocket, req) => {
      const sessionId = req.params.id;

      if (!sessionId) {
        console.error("WebSocket connection attempted without session ID");
        ws.close(1008, "Session ID required");
        return;
      }

      if (!this.agents.has(sessionId)) {
        console.error(
          `WebSocket connection attempted with unregistered session ID: ${sessionId}`
        );
        ws.close(1008, "Invalid session ID");
        return;
      }

      console.log(`WebSocket client connected with session ID: ${sessionId}`);
      this.connectedClients.add(ws);
      this.sessions.set(ws, sessionId);

      ws.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          this.handleMessage(parsed, ws, sessionId);
        } catch (error) {
          console.error("Failed to parse JSON message:", error);
        }
      });

      ws.on("close", () => {
        console.log(`Client disconnected from session: ${sessionId}`);
        this.connectedClients.delete(ws);
        this.sessions.delete(ws);
      });

      ws.on("error", (error) => {
        console.error(
          `WebSocket client error for session ${sessionId}:`,
          error
        );
        this.connectedClients.delete(ws);
        this.sessions.delete(ws);
      });
    });
  }

  registerAgent(sessionId: string) {
    this.agents.set(sessionId, null);
  }

  getAgent(sessionId: string) {
    return this.agents.get(sessionId) ?? null;
  }

  private handleMessage(data: unknown, ws: WebSocket, sessionId: string) {
    console.log("Received raw message:", data, sessionId);

    const messageValidation = VCCPMessageSchema.safeParse(data);
    if (!messageValidation.success) {
      console.error("Invalid message format:", messageValidation.error);
      return;
    }

    const message = messageValidation.data;
    console.log("Validated message:", message);

    if (message.type === "perception") {
      const agent = this.agents.get(sessionId);
      if (!agent) {
        return;
      }
      agent.latestPerceptions.set(message.category, message);
      console.log("Stored perception data:", message.category, sessionId);
    }
    if (message.type === "system" && message.category === "capability") {
      this.agents.set(sessionId, {
        ws,
        capability: message,
        latestPerceptions: new Map(),
      });
    }
  }

  async sendActionToSession(sessionId: string, action: VCCPMessage) {
    const agent = this.agents.get(sessionId);

    if (!agent) {
      return {
        success: false,
        message: `No client connected for session: ${sessionId}`,
      };
    }

    const client = agent.ws;

    if (client.readyState !== client.OPEN) {
      this.sessions.delete(client);
      this.agents.delete(sessionId);
      this.connectedClients.delete(client);
      return {
        success: false,
        message: `Client for session ${sessionId} is not connected`,
      };
    }

    try {
      client.send(JSON.stringify(action));
      console.log(`Action sent to session ${sessionId}:`, action);
      return {
        success: true,
        message: `Action sent to session: ${sessionId}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send action to session ${sessionId}: ${error}`,
      };
    }
  }

  getLatestPerception(sessionId: string): VCCPMessage[] | null {
    const agent = this.agents.get(sessionId);
    if (!agent) {
      return null;
    }
    const perception = [...agent.latestPerceptions.values()];
    return perception ?? null;
  }

  getCapability(sessionId: string): Record<string, any> | null {
    const agent = this.agents.get(sessionId);
    if (!agent) {
      return null;
    }
    const perception = agent.capability.data;
    return perception;
  }
}

const vccpServer = new VCCPServer();

const server = new McpServer({
  name: "vccp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "register-agent",
  "新しいagentを登録します。WebSocketクライアントはこのSession IDを使って接続する必要があります。",
  {},
  async ({}, { sessionId }) => {
    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `SessionIDが無効です`,
          },
        ],
      };
    }

    const agent = vccpServer.getAgent(sessionId);

    if (agent) {
      return {
        content: [
          {
            type: "text",
            text: `agentが既に登録されています`,
          },
        ],
      };
    }

    vccpServer.registerAgent(sessionId);

    return {
      content: [
        {
          type: "text",
          text: `Agentは正常に登録されました。 Session ID: ${sessionId}`,
        },
      ],
    };
  }
);

server.tool(
  "get-capability",
  "キャラクターが使用可能なactionの定義を取得します。",
  {},
  async ({}, { sessionId }) => {
    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `SessionIDが無効です`,
          },
        ],
      };
    }

    const data = vccpServer.getCapability(sessionId);

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  "get-perception",
  "知覚情報を取得します",
  {},
  async ({}, { sessionId }) => {
    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `SessionIDが無効です`,
          },
        ],
      };
    }

    const data = vccpServer.getLatestPerception(sessionId);

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  "play-action",
  "VRMキャラクターにアクションをさせます。キャラクターが可能なactionの定義を確認するには、get-capabilityツールを使用してください。",
  {
    action: z.record(z.any()),
  },
  async ({ action }, { sessionId }) => {
    const validation = VCCPMessageSchema.safeParse(action);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `無効なスキーマ: ${validation.error}`,
          },
        ],
      };
    }

    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `SessionIDが無効です`,
          },
        ],
      };
    }

    const result = await vccpServer.sendActionToSession(
      sessionId,
      validation.data
    );

    return {
      content: [
        {
          type: "text",
          text: result.success
            ? `アクションを実行しました。`
            : `アクションの実行に失敗しました: ${result.message}`,
        },
      ],
    };
  }
);

const app = express();
const wsInstance = expressWs(app);
const wsApp = wsInstance.app;

wsApp.use(express.json());
vccpServer.setupWebSocketRoutes(wsApp);

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

wsApp.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
        console.log(`MCP session initialized: ${sessionId}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`MCP session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };

    await server.connect(transport);
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
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

wsApp.get("/mcp", handleSessionRequest);

wsApp.delete("/mcp", handleSessionRequest);

wsApp.listen(3000, () => {
  console.log("MCP Server started on port 3000");
  console.log("WebSocket endpoint available at ws://localhost:3000/vccp");
});
