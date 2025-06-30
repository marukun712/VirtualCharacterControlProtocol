import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
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
const sessions = new Map<string, Session>();

function createErrorResponse(id: string | number | null | undefined, code: number, message: string, data?: unknown) {
  const error: { code: number; message: string; data?: unknown } = {
    code,
    message,
  };
  
  if (data !== undefined) {
    error.data = data;
  }

  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error,
  };
}

function createSuccessResponse(id: string | number | null | undefined, result: unknown) {
  if (id === null || id === undefined) return undefined;
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function getSession(sessionId: string) {
  return sessions.get(sessionId);
}

function parseRequest<T>(
  schema: ZodSchema<T>,
  body: unknown,
  id?: string | number | null
): { success: true; data: T } | { success: false; error: unknown } {
  const parsed = schema.safeParse(body);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, error: createErrorResponse(id, -32600, "Invalid Request") };
}

function handleJSONRPCMessage(message: string, ws: WSContext<WebSocket>) {
  let body: unknown;
  try {
    body = JSON.parse(message);
  } catch {
    return createErrorResponse(null, -32700, "Parse error");
  }

  const parsed = JSONRPCRequestSchema.safeParse(body);
  if (!parsed.success) {
    const id = typeof body === 'object' && body !== null && 'id' in body ? 
      (body as { id: string | number }).id : null;
    return createErrorResponse(id, -32600, "Invalid Request");
  }

  const request = parsed.data;

  switch (request.method) {
    case "register": {
      const parseResult = parseRequest(RegisterRequestSchema, body, request.id);
      if (!parseResult.success) {
        return parseResult.error;
      }

      const data = parseResult.data;
      for (const action of data.params.actions) {
        try {
          ajv.compile(action);
        } catch (error) {
          return createErrorResponse(request.id, -32602, "Invalid params");
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
      const parseResult = parseRequest(ActionGetRequestSchema, body, request.id);
      if (!parseResult.success) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(request.id, -32602, "Invalid params");
      }

      return createSuccessResponse(data.id, {
        actions: session.actions,
      });
    }
    case "action.play": {
      const parseResult = parseRequest(ActionPlayRequestSchema, body, request.id);
      if (!parseResult.success) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(request.id, -32602, "Invalid params");
      }

      const action = session.actions.find(
        (action) => action.title === data.params.action
      );

      if (!action) {
        return createErrorResponse(request.id, -32602, "Invalid params");
      }

      const validate = ajv.compile(action);
      const valid = validate(data.params.properties);

      if (!valid) {
        return createErrorResponse(request.id, -32602, "Invalid params", validate.errors);
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
        return createErrorResponse(request.id, -32603, "Internal error");
      }
    }
    case "perception.set": {
      const parseResult = parseRequest(PerceptionSetRequestSchema, body, request.id);
      if (!parseResult.success) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(request.id, -32602, "Invalid params");
      }

      session.perceptions.push({
        category: data.params.category,
        perception: data.params.perception,
      });

      return createSuccessResponse(data.id, {
        success: true,
      });
    }
    case "perception.category": {
      const parseResult = parseRequest(PerceptionCategoryRequestSchema, body, request.id);
      if (!parseResult.success) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(request.id, -32602, "Invalid params");
      }

      const categoryPerceptions = session.perceptions.filter(
        (p) => p.category === data.params.category
      );

      const latestPerception =
        categoryPerceptions[categoryPerceptions.length - 1];

      if (!latestPerception) {
        return createErrorResponse(request.id, -32002, "Perception not found");
      }

      return createSuccessResponse(data.id, {
        perception: latestPerception.perception,
      });
    }
    case "perception.list": {
      const parseResult = parseRequest(PerceptionListRequestSchema, body, request.id);
      if (!parseResult.success) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(request.id, -32602, "Invalid params");
      }

      return createSuccessResponse(data.id, {
        perceptions: session.perceptions,
      });
    }
    default: {
      return createErrorResponse(request.id, -32601, "Method not found");
    }
  }
}

app.get(
  "/ws",
  upgradeWebSocket(() => {
    return {
      onMessage(event, ws) {
        const res = handleJSONRPCMessage(event.data.toString(), ws);
        ws.send(JSON.stringify(res));
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

export default app;
