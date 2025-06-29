import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import {
  PlayRequestSchema,
  ActionsRequestSchema,
  JSONRPCRequestSchema,
  RegisterRequestSchema,
  Session,
} from "./schema";
import { randomUUIDv7 } from "bun";
import { WSContext } from "hono/ws";

const app = new Hono();
const sessions = new Map<string, Session>();

function handleJSONRPCMessage(message: string, ws: WSContext<WebSocket>) {
  const parsed = JSONRPCRequestSchema.safeParse(message);
  if (!parsed.success) {
    return {
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid Request",
      },
    };
  }

  const body = parsed.data;

  switch (body.method) {
    case "register": {
      const parsed = RegisterRequestSchema.safeParse(body);
      if (!parsed.success) {
        return {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
          },
        };
      }

      const id = randomUUIDv7();
      sessions.set(id, { ws, actions: parsed.data.params.actions });

      return {
        jsonrpc: "2.0",
        result: {
          sessionId: id,
        },
      };
    }
    case "actions": {
      const parsed = ActionsRequestSchema.safeParse(body);
      if (!parsed.success) {
        return {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
          },
        };
      }

      const session = sessions.get(parsed.data.params.sessionId);

      if (!session) {
        return {
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "Invalid params",
          },
        };
      }

      return {
        jsonrpc: "2.0",
        result: {
          actions: session.actions,
        },
      };
    }
    case "play": {
      const parsed = PlayRequestSchema.safeParse(body);
      if (!parsed.success) {
        return {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
          },
        };
      }

      const session = sessions.get(parsed.data.params.sessionId);

      if (!session) {
        return {
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "Invalid params",
          },
        };
      }

      const action = session.actions.find(
        (action) => action.name === parsed.data.params.name
      );

      if (!action) {
        return {
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "Invalid params",
          },
        };
      }

      try {
        session.ws.send(JSON.stringify(action));
        return {
          jsonrpc: "2.0",
          result: {
            success: true,
          },
        };
      } catch {
        return {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error",
          },
        };
      }
    }
    default: {
      return {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "Method not found",
        },
      };
    }
  }
}

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        const res = handleJSONRPCMessage(event.data.toString(), ws);
        ws.send(JSON.stringify(res));
      },
      onClose: (event, ws) => {
        sessions.forEach((session, key) => {
          if (session.ws == ws) {
            sessions.delete(key);
            console.log(key + "disconnected.");
          }
        });
      },
    };
  })
);

export default app;
