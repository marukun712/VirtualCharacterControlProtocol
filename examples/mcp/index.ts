import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { VCCPClient, type SchedulerAction } from "vccp-client";

const url = process.env.VCCP_URL || "ws://localhost:3000/ws";

const client = new VCCPClient(
  { url: url },
  {
    onOpen: () => {},
    onMessage: () => {},
    onExecute: () => {},
    onError: (error: string) => {
      console.error(error);
    },
  }
);
const agents = new Map<string, string>();

async function initializeVCCP() {
  console.log("[VCCP] Attempting to connect to VCCP server at" + url);
  try {
    await client.connect();
    console.log("[VCCP] ✓ VCCP client initialized successfully");
  } catch (error) {
    console.error("[VCCP ERROR] Failed to connect to VCCP server:", error);
  }
}
initializeVCCP();

setTimeout(() => {
  console.log("[MCP] Starting MCP server initialization...");

  const server = new McpServer({
    name: "vccp",
    version: "1.0.0",
    capabilities: {
      tools: {},
    },
  });

  console.log("[MCP] Registering tools...");

  server.tool(
    "action-list",
    "指定されたセッションで使用可能なアクションのリストを取得します。",
    {},
    async ({}, { sessionId }) => {
      console.log(`[TOOL:action-list] Called with sessionId: ${sessionId}`);
      try {
        if (!sessionId) {
          console.error("[TOOL:action-list] Error: Invalid MCP sessionId");
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };
        }

        const id = agents.get(sessionId);
        console.log(
          `[TOOL:action-list] VCCP session ID lookup: ${sessionId} -> ${id}`
        );

        if (!id) {
          console.error(
            "[TOOL:action-list] Error: No VCCP session found for MCP session"
          );
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };
        }

        console.log(
          `[TOOL:action-list] Fetching actions from VCCP for session: ${id}`
        );
        const data = await client.listActions(id);
        console.log(
          `[TOOL:action-list] Successfully retrieved ${data.result.actions.length} actions`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data.result.actions, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("[TOOL:action-list] Error:", error);
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
      console.log(
        `[TOOL:action-get] Called with actionName: ${actionName}, sessionId: ${sessionId}`
      );
      try {
        if (!sessionId) {
          console.error("[TOOL:action-get] Error: Invalid MCP sessionId");
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };
        }

        const id = agents.get(sessionId);
        console.log(
          `[TOOL:action-get] VCCP session ID lookup: ${sessionId} -> ${id}`
        );

        if (!id) {
          console.error(
            "[TOOL:action-get] Error: No VCCP session found for MCP session"
          );
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };
        }

        console.log(
          `[TOOL:action-get] Fetching action details for: ${actionName}`
        );
        const data = await client.getAction(id, actionName);
        console.log(
          `[TOOL:action-get] Successfully retrieved action schema for: ${actionName}`
        );

        return {
          content: [
            { type: "text", text: JSON.stringify(data.result, null, 2) },
          ],
        };
      } catch (error) {
        console.error("[TOOL:action-get] Error:", error);
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
      console.log(
        `[TOOL:action-play] Called with actionName: ${actionName}, sessionId: ${sessionId}`
      );
      console.log(`[TOOL:action-play] Parameters:`, JSON.stringify(parameters));

      try {
        if (!sessionId) {
          console.error("[TOOL:action-play] Error: Invalid MCP sessionId");
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };
        }

        const id = agents.get(sessionId);
        console.log(
          `[TOOL:action-play] VCCP session ID lookup: ${sessionId} -> ${id}`
        );

        if (!id) {
          console.error(
            "[TOOL:action-play] Error: No VCCP session found for MCP session"
          );
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };
        }

        console.log(`[TOOL:action-play] Executing action: ${actionName}`);
        const data = await client.playAction(id, actionName, parameters);
        console.log(
          `[TOOL:action-play] ✓ Action executed successfully: ${actionName}`
        );

        return {
          content: [
            { type: "text", text: JSON.stringify(data.result, null, 2) },
          ],
        };
      } catch (error) {
        console.error("[TOOL:action-play] Error:", error);
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
      console.log(
        `[TOOL:perception-category] Called with category: ${category}, sessionId: ${sessionId}`
      );
      try {
        if (!sessionId) {
          console.error(
            "[TOOL:perception-category] Error: Invalid MCP sessionId"
          );
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };
        }

        const id = agents.get(sessionId);
        console.log(
          `[TOOL:perception-category] VCCP session ID lookup: ${sessionId} -> ${id}`
        );

        if (!id) {
          console.error(
            "[TOOL:perception-category] Error: No VCCP session found for MCP session"
          );
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };
        }

        console.log(
          `[TOOL:perception-category] Fetching perceptions for category: ${category}`
        );
        const data = await client.getPerceptionByCategory(id, category);
        console.log(
          `[TOOL:perception-category] Retrieved ${data.result.perceptions.length} perceptions`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data.result.perceptions, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("[TOOL:perception-category] Error:", error);
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
      console.log(`[TOOL:perception-list] Called with sessionId: ${sessionId}`);
      try {
        if (!sessionId) {
          console.error("[TOOL:perception-list] Error: Invalid MCP sessionId");
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };
        }

        const id = agents.get(sessionId);
        console.log(
          `[TOOL:perception-list] VCCP session ID lookup: ${sessionId} -> ${id}`
        );

        if (!id) {
          console.error(
            "[TOOL:perception-list] Error: No VCCP session found for MCP session"
          );
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };
        }

        console.log(`[TOOL:perception-list] Fetching all perceptions`);
        const data = await client.listPerception(id);
        console.log(
          `[TOOL:perception-list] Retrieved ${data.result.perceptions.length} total perceptions`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data.result.perceptions, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("[TOOL:perception-list] Error:", error);
        return {
          content: [
            { type: "text", text: `エラー: ${(error as Error).message}` },
          ],
        };
      }
    }
  );

  server.tool(
    "scheduler-send",
    "複数のアクションをスケジュールして送信します",
    {
      duration: z.number(),
      actions: z.array(
        z.object({
          time: z.number(),
          action: z.string(),
          properties: z.any(),
        })
      ),
    },
    async ({ duration, actions }, { sessionId }) => {
      console.log(
        `[TOOL:scheduler-send] Called with duration: ${duration}, actions: ${actions.length}, sessionId: ${sessionId}`
      );
      try {
        if (!sessionId) {
          console.error("[TOOL:scheduler-send] Error: Invalid MCP sessionId");
          return {
            content: [
              {
                type: "text",
                text: `エラー: MCPサーバーのSessionIdが不正です`,
              },
            ],
          };
        }

        const id = agents.get(sessionId);
        console.log(
          `[TOOL:scheduler-send] VCCP session ID lookup: ${sessionId} -> ${id}`
        );

        if (!id) {
          console.error(
            "[TOOL:scheduler-send] Error: No VCCP session found for MCP session"
          );
          return {
            content: [
              {
                type: "text",
                text: `エラー: 先にMCPサーバーに初期化リクエストを送ってください!`,
              },
            ],
          };
        }

        console.log(
          `[TOOL:scheduler-send] Sending scheduler with ${actions.length} actions`
        );
        const data = await client.sendScheduler(
          id,
          duration,
          actions as SchedulerAction[]
        );
        console.log(`[TOOL:scheduler-send] ✓ Scheduler sent successfully`);

        return {
          content: [
            { type: "text", text: JSON.stringify(data.result, null, 2) },
          ],
        };
      } catch (error) {
        console.error("[TOOL:scheduler-send] Error:", error);
        return {
          content: [
            { type: "text", text: `エラー: ${(error as Error).message}` },
          ],
        };
      }
    }
  );

  console.log("[MCP] ✓ All tools registered successfully");

  const app = express();
  app.use(express.json());

  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  app.post("/mcp/:id", async (req, res) => {
    const vccpSessionId = req.params.id;
    const mcpSessionId = req.headers["mcp-session-id"] as string | undefined;

    console.log(
      `[HTTP] POST /mcp/${vccpSessionId} - MCP Session: ${
        mcpSessionId || "none"
      }`
    );
    console.log(
      `[HTTP] Request body:`,
      JSON.stringify(req.body).substring(0, 200) + "..."
    );

    let transport: StreamableHTTPServerTransport;

    if (mcpSessionId && transports[mcpSessionId]) {
      console.log(
        `[SESSION] Using existing transport for session: ${mcpSessionId}`
      );
      transport = transports[mcpSessionId];
    } else if (!mcpSessionId && isInitializeRequest(req.body)) {
      console.log(
        `[SESSION] Initialize request detected, creating new session`
      );

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => {
          const newSessionId = randomUUID();
          console.log(`[SESSION] Generated new session ID: ${newSessionId}`);
          return newSessionId;
        },
        onsessioninitialized: (sessionId) => {
          console.log(`[SESSION] Session initialized: ${sessionId}`);
          console.log(
            `[SESSION] Mapping MCP session ${sessionId} to VCCP session ${vccpSessionId}`
          );
          transports[sessionId] = transport;
          agents.set(sessionId, vccpSessionId);
          console.log(
            `[SESSION] Active sessions: ${Object.keys(transports).length}`
          );
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`[SESSION] Closing session: ${transport.sessionId}`);
          delete transports[transport.sessionId];
          agents.delete(transport.sessionId);
          console.log(
            `[SESSION] Remaining active sessions: ${
              Object.keys(transports).length
            }`
          );
        }
      };

      await server.connect(transport);
      console.log(`[SESSION] MCP server connected to transport`);
    } else {
      console.error(`[HTTP] Bad request: No valid session ID provided`);
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

    console.log(`[HTTP] Handling request via transport`);
    await transport.handleRequest(req, res, req.body);
  });

  const handleSessionRequest = async (
    req: express.Request,
    res: express.Response
  ) => {
    const vccpSessionId = req.params.id;
    const mcpSessionId = req.headers["mcp-session-id"] as string | undefined;

    console.log(
      `[HTTP] ${req.method} /mcp/${vccpSessionId} - MCP Session: ${
        mcpSessionId || "none"
      }`
    );

    if (!mcpSessionId || !transports[mcpSessionId]) {
      console.error(`[HTTP] Invalid or missing session ID: ${mcpSessionId}`);
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports[mcpSessionId];
    console.log(
      `[HTTP] Processing ${req.method} request for session: ${mcpSessionId}`
    );
    await transport.handleRequest(req, res);
  };

  app.get("/mcp/:id", handleSessionRequest);
  app.delete("/mcp/:id", handleSessionRequest);

  const port = process.env.MCP_PORT || 3001;

  app.listen(port, () => {
    console.log("[SERVER] ====================================");
    console.log("[SERVER] MCP Server listening on port " + port);
    console.log("[SERVER] Endpoints:");
    console.log("[SERVER]   POST   /mcp/:vccpSessionId");
    console.log("[SERVER]   GET    /mcp/:vccpSessionId");
    console.log("[SERVER]   DELETE /mcp/:vccpSessionId");
    console.log("[SERVER] ====================================");
  });

  console.log("[MCP] ✓ MCP server setup complete");
}, 1000);
