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

  private agents: Map<string, Agent> = new Map();
  private sessions: Map<WebSocket, string> = new Map();

  setupWebSocketRoutes(app: expressWs.Application): void {
    app.ws("/vccp", (ws: WebSocket, req) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      console.log(
        `Client connected to VCCP WebSocket server${
          sessionId ? ` with session: ${sessionId}` : ""
        }`
      );

      if (!sessionId) {
        return;
      }

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
        const sessionId = this.sessions.get(ws);
        console.log(
          `Client disconnected from VCCP WebSocket server${
            sessionId ? ` (session: ${sessionId})` : ""
          }`
        );

        this.connectedClients.delete(ws);
        if (sessionId) {
          this.sessions.delete(ws);
        }
      });

      ws.on("error", (error) => {
        const sessionId = this.sessions.get(ws);
        console.error("WebSocket client error:", error);

        this.connectedClients.delete(ws);
        if (sessionId) {
          this.sessions.delete(ws);
        }
      });
    });
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

  getLatestPerception(sessionId: string, category: string): VCCPMessage | null {
    const agent = this.agents.get(sessionId);
    if (!agent) {
      return null;
    }
    const perception = agent.latestPerceptions.get(category);
    return perception ?? null;
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
  "get-perception",
  "知覚情報を取得します",
  {
    category: z.string().describe("知覚情報のカテゴリ"),
  },
  async ({ category }, { sessionId }) => {
    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `session idが無効です`,
          },
        ],
      };
    }

    const data = vccpServer.getLatestPerception(sessionId, category);

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  "move-character",
  "VRMキャラクターを指定位置に移動させます",
  {
    x: z.number().describe("X座標"),
    y: z.number().describe("Y座標"),
    z: z.number().describe("Z座標"),
    speed: z.number().optional().default(1.0).describe("移動速度"),
  },
  async ({ x, y, z, speed }, { sessionId }) => {
    const actionData = {
      type: "action",
      category: "movement",
      timestamp: new Date().toISOString(),
      data: {
        target: { x, y, z },
        speed,
      },
    };

    const validation = VCCPMessageSchema.safeParse(actionData);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `無効な移動パラメータです: ${validation.error}`,
          },
        ],
      };
    }

    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `session idが無効です`,
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
            ? `キャラクターを座標(${x}, ${y}, ${z})に移動させました`
            : `移動に失敗しました: ${result.message}`,
        },
      ],
    };
  }
);

server.tool(
  "look-at",
  "VRMキャラクターの視線を指定位置に向けます",
  {
    x: z.number().describe("X座標"),
    y: z.number().describe("Y座標"),
    z: z.number().describe("Z座標"),
  },
  async ({ x, y, z }, { sessionId }) => {
    const actionData = {
      type: "action",
      category: "lookAt",
      timestamp: new Date().toISOString(),
      data: {
        target: {
          type: "position",
          value: { x, y, z },
        },
      },
    };

    const validation = VCCPMessageSchema.safeParse(actionData);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `無効な視線制御パラメータです: ${validation.error}`,
          },
        ],
      };
    }

    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `session idが無効です`,
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
            ? `キャラクターの視線を座標(${x}, ${y}, ${z})に向けました`
            : `視線制御に失敗しました: ${result.message}`,
        },
      ],
    };
  }
);

server.tool(
  "set-expression",
  "VRMキャラクターの表情を設定します",
  {
    preset: z
      .enum(["happy", "angry", "sad", "neutral"])
      .describe("表情プリセット"),
  },
  async ({ preset }, { sessionId }) => {
    const actionData = {
      type: "action",
      category: "expression",
      timestamp: new Date().toISOString(),
      data: { preset },
    };

    const validation = VCCPMessageSchema.safeParse(actionData);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `無効な表情パラメータです: ${validation.error}`,
          },
        ],
      };
    }

    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `session idが無効です`,
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
            ? `キャラクターの表情を「${preset}」に設定しました`
            : `表情制御に失敗しました: ${result.message}`,
        },
      ],
    };
  }
);

server.tool(
  "play-animation",
  "VRMキャラクターにBVHアニメーションを再生させます",
  {
    bvh: z.string().describe("Base64エンコードされたBVHデータ"),
  },
  async ({ bvh }, { sessionId }) => {
    const actionData = {
      type: "action",
      category: "anim",
      timestamp: new Date().toISOString(),
      data: { bvh },
    };

    const validation = VCCPMessageSchema.safeParse(actionData);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `無効なアニメーションパラメータです: ${validation.error}`,
          },
        ],
      };
    }

    if (!sessionId) {
      return {
        content: [
          {
            type: "text",
            text: `session idが無効です`,
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
            ? "キャラクターにアニメーションを再生させました"
            : `アニメーション再生に失敗しました: ${result.message}`,
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
