import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import {
  ActionPlayRequestSchema,
  ActionGetRequestSchema,
  JSONRPCRequestSchema,
  RegisterRequestSchema,
  PerceptionSetRequestSchema,
  PerceptionCategoryRequestSchema,
  PerceptionListRequestSchema,
  Session,
} from "./schema";
import { randomUUIDv7 } from "bun";
import { WSContext } from "hono/ws";
import Ajv from "ajv";
import { ZodSchema } from "zod";

const ajv = new Ajv();

const app = new Hono();
const { upgradeWebSocket, websocket } = createBunWebSocket();
const sessions = new Map<string, Session>();

function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string
) {
  const error: { code: number; message: string } = {
    code,
    message,
  };
  const data: Record<string, any> = { jsonrpc: "2.0" };
  if (id !== null) {
    data.id = id;
  }
  data.error = error;
  return data;
}

function createSuccessResponse(
  id: string | number | null,
  result: Record<string, any>
) {
  if (!id) return null;
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function getSession(sessionId: string) {
  return sessions.get(sessionId);
}

function parseRequest<T>(schema: ZodSchema<T>, body: Record<string, any>) {
  const parsed = schema.safeParse(body);
  return parsed.success
    ? { data: parsed.data, error: null }
    : {
        data: null,
        error: createErrorResponse(null, -32600, "Invalid Request"),
      };
}

function handleJSONRPCMessage(message: string, ws: WSContext<unknown>) {
  const parsed = JSONRPCRequestSchema.safeParse(JSON.parse(message));
  if (!parsed.success) {
    return createErrorResponse(null, -32600, "Invalid Request");
  }

  const request = parsed.data;

  switch (request.method) {
    case "register": {
      const parseResult = parseRequest(RegisterRequestSchema, parsed.data);
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      for (const action of data.params.actions) {
        try {
          ajv.compile(action);
        } catch (error) {
          console.log(error);
          return createErrorResponse(data.id, -32602, "Invalid params");
        }
      }

      const id = randomUUIDv7();
      sessions.set(id, {
        ws,
        actions: data.params.actions,
        perceptions: [],
      });

      return createSuccessResponse(data.id, {
        sessionId: id,
      });
    }
    case "action.get": {
      const parseResult = parseRequest(ActionGetRequestSchema, parsed.data);
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      return createSuccessResponse(data.id, {
        actions: session.actions,
      });
    }
    case "action.play": {
      const parseResult = parseRequest(ActionPlayRequestSchema, parsed.data);
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      const action = session.actions.find(
        (action) => action.title === data.params.action
      );

      if (!action) {
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      const validate = ajv.compile(action);
      const valid = validate(data.params.properties);

      if (!valid) {
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      try {
        session.ws.send(
          JSON.stringify({
            action: data.params.action,
            properties: data.params.properties,
          })
        );
        return createSuccessResponse(data.id, {
          success: true,
        });
      } catch {
        return createErrorResponse(data.id, -32603, "Internal error");
      }
    }
    case "perception.set": {
      const parseResult = parseRequest(PerceptionSetRequestSchema, parsed.data);
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(null, -32602, "Invalid params");
      }

      session.perceptions.push({
        category: data.params.category,
        perception: data.params.perception,
      });

      return null;
    }
    case "perception.category": {
      const parseResult = parseRequest(
        PerceptionCategoryRequestSchema,
        parsed.data
      );
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      const categoryPerceptions = session.perceptions.filter(
        (p) => p.category === data.params.category
      );

      return createSuccessResponse(data.id, {
        perceptions: categoryPerceptions,
      });
    }
    case "perception.list": {
      const parseResult = parseRequest(
        PerceptionListRequestSchema,
        parsed.data
      );
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      return createSuccessResponse(data.id, {
        perceptions: session.perceptions,
      });
    }
    default: {
      return createErrorResponse(
        parsed.data.id ?? null,
        -32601,
        "Method not found"
      );
    }
  }
}

app.get(
  "/ws",
  upgradeWebSocket(() => {
    return {
      onMessage(event, ws) {
        const res = handleJSONRPCMessage(event.data.toString(), ws);
        if (res) ws.send(JSON.stringify(res));
      },
      onClose: (_, ws) => {
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

export default {
  fetch: app.fetch,
  websocket,
};
