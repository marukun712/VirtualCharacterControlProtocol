import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  type VCCPMessage,
  type PerceptionData,
  type ActionData,
  type ActionResult,
} from "./types.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import expressWs from "express-ws";
import type { WebSocket } from "ws";

class VCCPServer {
  private latestPerceptions: Map<string, PerceptionData> = new Map();
  private connectedClients: Set<WebSocket> = new Set();

  setupWebSocketRoutes(app: expressWs.Application): void {
    app.ws("/vccp", (ws: WebSocket, req) => {
      console.log("Client connected to VCCP WebSocket server");
      this.connectedClients.add(ws);

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString()) as VCCPMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected from VCCP WebSocket server");
        this.connectedClients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket client error:", error);
        this.connectedClients.delete(ws);
      });
    });
  }

  private handleMessage(message: VCCPMessage) {
    console.log("Received message:", message);

    if (message.type === "perception") {
      const perception = message as PerceptionData;

      this.latestPerceptions.set(perception.category, perception);
    }
  }

  async sendAction(action: ActionData): Promise<ActionResult> {
    if (this.connectedClients.size === 0) {
      return {
        success: false,
        message: "No clients connected",
      };
    }

    try {
      this.broadcastToClients(action);
      return {
        success: true,
        message: "Action sent to all connected clients",
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send action: ${error}`,
      };
    }
  }

  getLatestPerception(category: string): PerceptionData | null {
    return this.latestPerceptions.get(category) || null;
  }

  broadcastToClients(message: VCCPMessage): void {
    if (this.connectedClients.size === 0) {
      console.warn("Cannot send event: No clients connected");
      return;
    }

    const messageStr = JSON.stringify(message);
    const deadClients = new Set<WebSocket>();

    this.connectedClients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error("Failed to send message to client:", error);
          deadClients.add(client);
        }
      } else {
        deadClients.add(client);
      }
    });

    deadClients.forEach((client) => {
      this.connectedClients.delete(client);
    });

    console.log(
      `Event sent to ${this.connectedClients.size} clients:`,
      message
    );
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
  async ({ category }) => {
    const data = vccpServer.getLatestPerception(category);

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
  async ({ x, y, z, speed }) => {
    const action: ActionData = {
      type: "action",
      category: "movement",
      timestamp: new Date().toISOString(),
      data: {
        target: { x, y, z },
        speed,
      },
    };

    const result = await vccpServer.sendAction(action);

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
  async ({ x, y, z }) => {
    const action: ActionData = {
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

    const result = await vccpServer.sendAction(action);

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
  async ({ preset }) => {
    const action: ActionData = {
      type: "action",
      category: "expression",
      timestamp: new Date().toISOString(),
      data: { preset },
    };

    const result = await vccpServer.sendAction(action);

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
  async ({ bvh }) => {
    const action: ActionData = {
      type: "action",
      category: "anim",
      timestamp: new Date().toISOString(),
      data: { bvh },
    };

    const result = await vccpServer.sendAction(action);

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
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
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
