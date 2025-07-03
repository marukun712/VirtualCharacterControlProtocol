import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { VCCPClient } from "vccp-client";

const client = new VCCPClient({ url: "ws://localhost:3000/ws" });
const agents = new Map<string, string>();

async function initializeVCCP() {
  try {
    await client.connect();
    console.log("VCCP client initialized successfully");
  } catch (error) {
    console.error("Failed to connect to VCCP server:", error);
  }
}
initializeVCCP();

setTimeout(() => {
  const server = new McpServer({
    name: "vccp",
    version: "1.0.0",
    capabilities: {
      tools: {},
    },
  });

  server.tool(
    "action-list",
    "指定されたセッションで使用可能なアクションのリストを取得します。",
    {},
    async ({}, { sessionId }) => {
      try {
        if (!sessionId)
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };

        const id = agents.get(sessionId);

        if (!id)
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };

        const data = await client.listActions(id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data.result.actions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `エラー: ${(error as Error).message}` },
          ],
        };
      }
    }
  );

  server.tool(
    "action-get",
    "アクションの詳細スキーマを取得します。action-listの後に使ってください。",
    {
      actionName: z.string(),
    },
    async ({ actionName }, { sessionId }) => {
      try {
        if (!sessionId)
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };

        const id = agents.get(sessionId);

        if (!id)
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };

        const data = await client.getAction(id, actionName);

        return {
          content: [
            { type: "text", text: JSON.stringify(data.result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `エラー: ${(error as Error).message}` },
          ],
        };
      }
    }
  );

  server.tool(
    "action-play",
    "アクションを実行します",
    {
      actionName: z.string(),
      parameters: z.any(),
    },
    async ({ actionName, parameters }, { sessionId }) => {
      try {
        if (!sessionId)
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };

        const id = agents.get(sessionId);

        if (!id)
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };

        const data = await client.playAction(id, actionName, parameters);
        return {
          content: [
            { type: "text", text: JSON.stringify(data.result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `エラー: ${(error as Error).message}` },
          ],
        };
      }
    }
  );

  server.tool(
    "perception-category",
    "カテゴリごとの最新の知覚情報を取得します",
    {
      category: z.string(),
    },
    async ({ category }, { sessionId }) => {
      try {
        if (!sessionId)
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };

        const id = agents.get(sessionId);

        if (!id)
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };

        const data = await client.getPerceptionByCategory(id, category);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data.result.perceptions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `エラー: ${(error as Error).message}` },
          ],
        };
      }
    }
  );

  server.tool(
    "perception-list",
    "すべての知覚情報を取得します",
    {},
    async ({}, { sessionId }) => {
      try {
        if (!sessionId)
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };

        const id = agents.get(sessionId);

        if (!id)
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };

        const data = await client.listPerception(id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data.result.perceptions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `エラー: ${(error as Error).message}` },
          ],
        };
      }
    }
  );

  const app = express();
  app.use(express.json());

  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  app.post("/mcp/:id", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          transports[sessionId] = transport;
          agents.set(sessionId, req.params.id);
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

  app.get("/mcp", handleSessionRequest);
  app.delete("/mcp", handleSessionRequest);
  app.listen(3001, () => {
    console.log("MCP Server listening on port 3001");
  });
}, 1000);
