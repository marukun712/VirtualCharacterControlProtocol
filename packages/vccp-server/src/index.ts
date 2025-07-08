import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import {
  ActionPlayRequestSchema,
  ActionListRequestSchema,
  ActionGetRequestSchema,
  JSONRPCRequestSchema,
  RegisterRequestSchema,
  PerceptionSetRequestSchema,
  PerceptionCategoryRequestSchema,
  PerceptionListRequestSchema,
  SchedulerSendRequestSchema,
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

  console.error(`[ERROR] Code: ${code}, Message: ${message}, ID: ${id}`);

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
  const session = sessions.get(sessionId);
  if (!session) {
    console.warn(`[SESSION] Session not found: ${sessionId}`);
  }
  return session;
}

function parseRequest<T>(schema: ZodSchema<T>, body: Record<string, any>) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error(`[PARSE ERROR] Failed to parse request:`, parsed.error);
  }
  return parsed.success
    ? { data: parsed.data, error: null }
    : {
        data: null,
        error: createErrorResponse(null, -32600, "Invalid Request"),
      };
}

function handleJSONRPCMessage(message: string, ws: WSContext<unknown>) {
  console.log(`[MESSAGE] Received: ${message}`);

  let parsedMessage;
  try {
    parsedMessage = JSON.parse(message);
  } catch (e) {
    console.error(`[PARSE ERROR] Failed to parse JSON:`, e);
    return createErrorResponse(null, -32700, "Parse error");
  }

  const parsed = JSONRPCRequestSchema.safeParse(parsedMessage);
  if (!parsed.success) {
    console.error(`[VALIDATION ERROR] Invalid JSON-RPC request:`, parsed.error);
    return createErrorResponse(null, -32600, "Invalid Request");
  }

  const request = parsed.data;
  console.log(`[METHOD] Processing method: ${request.method}`);

  switch (request.method) {
    case "register": {
      console.log(`[REGISTER] Starting registration process`);
      const parseResult = parseRequest(RegisterRequestSchema, parsed.data);
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      console.log(
        `[REGISTER] Validating ${data.params.actions.length} actions`
      );

      for (const action of data.params.actions) {
        try {
          ajv.compile(action);
          console.log(`[REGISTER] Action schema validated: ${action.title}`);
        } catch (error) {
          console.error(
            `[REGISTER ERROR] Failed to compile action schema:`,
            error
          );
          return createErrorResponse(data.id, -32602, "Invalid params");
        }
      }

      const id = randomUUIDv7();
      sessions.set(id, {
        ws,
        actions: data.params.actions,
        perceptions: [],
      });

      console.log(`[REGISTER] New session created: ${id}`);
      console.log(`[REGISTER] Total active sessions: ${sessions.size}`);

      return createSuccessResponse(data.id, {
        sessionId: id,
      });
    }
    case "action.list": {
      console.log(`[ACTION.LIST] Listing actions`);
      const parseResult = parseRequest(ActionListRequestSchema, parsed.data);
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      console.log(
        `[ACTION.LIST] Returning ${session.actions.length} actions for session: ${data.params.sessionId}`
      );
      return createSuccessResponse(data.id, {
        actions: session.actions,
      });
    }
    case "action.get": {
      console.log(`[ACTION.GET] Getting action details`);
      const parseResult = parseRequest(ActionGetRequestSchema, parsed.data);
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
        console.warn(`[ACTION.GET] Action not found: ${data.params.action}`);
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      console.log(`[ACTION.GET] Found action: ${data.params.action}`);
      return createSuccessResponse(data.id, action);
    }
    case "action.play": {
      console.log(`[ACTION.PLAY] Playing action`);
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
        console.warn(`[ACTION.PLAY] Action not found: ${data.params.action}`);
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      console.log(
        `[ACTION.PLAY] Validating properties for action: ${data.params.action}`
      );
      const validate = ajv.compile(action);
      const valid = validate(data.params.properties);

      if (!valid) {
        console.error(`[ACTION.PLAY] Validation failed:`, validate.errors);
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      try {
        const payload = {
          type: "play",
          action: data.params.action,
          properties: data.params.properties,
        };
        console.log(
          `[ACTION.PLAY] Sending action to client:`,
          JSON.stringify(payload)
        );
        session.ws.send(JSON.stringify(payload));

        console.log(
          `[ACTION.PLAY] Action sent successfully: ${data.params.action}`
        );
        return createSuccessResponse(data.id, {
          success: true,
        });
      } catch (error) {
        console.error(`[ACTION.PLAY ERROR] Failed to send action:`, error);
        return createErrorResponse(data.id, -32603, "Internal error");
      }
    }
    case "perception.set": {
      console.log(`[PERCEPTION.SET] Setting perception`);
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

      console.log(
        `[PERCEPTION.SET] Added perception - Category: ${data.params.category}, Total perceptions: ${session.perceptions.length}`
      );

      return null;
    }
    case "perception.category": {
      console.log(`[PERCEPTION.CATEGORY] Getting perceptions by category`);
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

      console.log(
        `[PERCEPTION.CATEGORY] Found ${categoryPerceptions.length} perceptions for category: ${data.params.category}`
      );

      return createSuccessResponse(data.id, {
        perceptions: categoryPerceptions,
      });
    }
    case "perception.list": {
      console.log(`[PERCEPTION.LIST] Listing all perceptions`);
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

      console.log(
        `[PERCEPTION.LIST] Returning ${session.perceptions.length} perceptions for session: ${data.params.sessionId}`
      );
      return createSuccessResponse(data.id, {
        perceptions: session.perceptions,
      });
    }
    case "scheduler.send": {
      console.log(`[SCHEDULER.SEND] Sending scheduled actions`);
      const parseResult = parseRequest(SchedulerSendRequestSchema, parsed.data);
      if (!parseResult.data) {
        return parseResult.error;
      }

      const data = parseResult.data;
      const session = getSession(data.params.sessionId);

      if (!session) {
        return createErrorResponse(data.id, -32602, "Invalid params");
      }

      for (const scheduledAction of data.params.actions) {
        const action = session.actions.find(
          (action) => action.title === scheduledAction.action
        );
        if (!action) {
          console.warn(
            `[SCHEDULER.SEND] Action not found: ${scheduledAction.action}`
          );
          return createErrorResponse(data.id, -32602, "Invalid params");
        }

        const validate = ajv.compile(action);
        const valid = validate(scheduledAction.properties);
        if (!valid) {
          console.error(
            `[SCHEDULER.SEND] Validation failed for action ${scheduledAction.action}:`,
            validate.errors
          );
          return createErrorResponse(data.id, -32602, "Invalid params");
        }
      }

      try {
        const payload = {
          type: "scheduler",
          duration: data.params.duration,
          actions: data.params.actions,
        };
        console.log(
          `[SCHEDULER.SEND] Sending scheduler payload to client:`,
          JSON.stringify(payload)
        );
        session.ws.send(JSON.stringify(payload));

        console.log(
          `[SCHEDULER.SEND] Scheduler payload sent successfully with ${data.params.actions.length} actions`
        );
        return createSuccessResponse(data.id, {
          success: true,
        });
      } catch (error) {
        console.error(
          `[SCHEDULER.SEND ERROR] Failed to send scheduler payload:`,
          error
        );
        return createErrorResponse(data.id, -32603, "Internal error");
      }
    }
    default: {
      console.warn(`[METHOD] Unknown method: ${parsed.data.method}`);
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
      onOpen(event, ws) {
        console.log(`[WEBSOCKET] New connection established`);
      },
      onMessage(event, ws) {
        const res = handleJSONRPCMessage(event.data.toString(), ws);
        if (res) {
          console.log(`[RESPONSE] Sending:`, JSON.stringify(res));
          ws.send(JSON.stringify(res));
        }
      },
      onClose: (_, ws) => {
        console.log(`[WEBSOCKET] Connection closed`);
        sessions.forEach((session, key) => {
          if (session.ws == ws) {
            sessions.delete(key);
            console.log(`[SESSION] Session removed: ${key}`);
            console.log(
              `[SESSION] Remaining active sessions: ${sessions.size}`
            );
          }
        });
      },
      onError(event, ws) {
        console.error(`[WEBSOCKET ERROR]`, event);
      },
    };
  })
);

console.log(`[SERVER] WebSocket server started on /ws`);

export default {
  fetch: app.fetch,
  websocket,
};
