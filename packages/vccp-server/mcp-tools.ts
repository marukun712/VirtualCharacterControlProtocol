import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VCCPMessageSchema, type SessionManager } from "./types.js";

export function setupMCPTools(server: McpServer, sessionManager: SessionManager): void {
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

      const agent = sessionManager.getAgent(sessionId);

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

      sessionManager.registerAgent(sessionId);

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

      const data = sessionManager.getCapability(sessionId);

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

      const data = sessionManager.getLatestPerception(sessionId);

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

      const result = await sessionManager.sendActionToSession(
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
}