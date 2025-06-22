import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  type VCCPMessage,
  type PerceptionData,
  type ActionData,
  type ActionResult,
} from "./types.js";

class VCCPServer {
  private wsUrl = "ws://localhost:3000/vccp";
  private ws: WebSocket | null = null;
  private connected = false;
  private latestPerceptions: Map<string, PerceptionData> = new Map();

  async connectToServer(): Promise<boolean> {
    if (this.connected) return true;

    try {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      return new Promise((resolve) => {
        ws.onopen = () => {
          this.connected = true;
          console.log("Connected to VCCP server");
          resolve(true);
        };

        ws.onerror = (error) => {
          console.error("WebSocket connection error:", error);
          resolve(false);
        };

        ws.onclose = () => {
          this.connected = false;
          console.log("Disconnected from VCCP server");
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as VCCPMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse message:", error);
          }
        };
      });
    } catch (error) {
      console.error("Failed to connect to WebSocket server:", error);
      return false;
    }
  }

  private handleMessage(message: VCCPMessage) {
    console.log("Received message:", message);

    if (message.type === "perception") {
      const perception = message as PerceptionData;

      this.latestPerceptions.set(perception.category, perception);
    }
  }

  async sendAction(action: ActionData): Promise<ActionResult> {
    if (!this.connected || !this.ws) {
      return {
        success: false,
        message: "Not connected to server",
      };
    }

    try {
      this.ws.send(JSON.stringify(action));
      return {
        success: true,
        message: "Action sent successfully",
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
      .enum([
        "a",
        "e",
        "i",
        "o",
        "u",
        "blink",
        "joy",
        "angry",
        "sorrow",
        "fun",
        "lookup",
        "lookdown",
        "lookleft",
        "lookright",
        "blink_l",
        "blink_r",
        "neutral",
      ])
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("VCCP MCP Server running on stdio");

  setTimeout(async () => {
    console.error("Attempting to connect to VCCP server...");
    await vccpServer.connectToServer();
  }, 1000);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
