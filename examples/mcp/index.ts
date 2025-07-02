import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { VCCPClient } from "vccp-client";

const client = new VCCPClient({ url: "ws://localhost:3000/ws" });

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
    { sessionId: z.string() },
    async ({ sessionId }) => {
      try {
        const data = await client.listActions(sessionId);
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
      sessionId: z.string(),
      actionName: z.string(),
    },
    async ({ sessionId, actionName }) => {
      try {
        const data = await client.getAction(sessionId, actionName);

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
    "指定されたセッションでアクションを実行します",
    {
      sessionId: z.string(),
      actionName: z.string(),
      parameters: z.record(z.any()),
    },
    async ({ sessionId, actionName, parameters }) => {
      try {
        const data = await client.playAction(sessionId, actionName, parameters);
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
    "指定されたセッションとカテゴリの最新の知覚情報を取得します",
    {
      sessionId: z.string(),
      category: z.string(),
    },
    async ({ sessionId, category }) => {
      try {
        const data = await client.getPerceptionByCategory(category, sessionId);
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
    "指定されたセッションのすべての知覚情報を取得します",
    { sessionId: z.string() },
    async ({ sessionId }) => {
      try {
        const data = await client.listPerception(sessionId);
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

  app.post("/mcp", async (req, res) => {
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

  app.get("/mcp", handleSessionRequest);
  app.delete("/mcp", handleSessionRequest);
  app.listen(3001, () => {
    console.log("MCP Server listening on port 3001");
  });
}, 1000);
