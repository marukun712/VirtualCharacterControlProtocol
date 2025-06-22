import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import {
  VCCPMessage,
  VCCPMessageSchema,
  PerceptionData,
  SystemMessage,
} from "./types";
import { WSContext } from "hono/ws";

const { upgradeWebSocket, websocket } = createBunWebSocket();
const app = new Hono();

let clientSocket: WSContext | null = null;

app.get(
  "/vccp",
  upgradeWebSocket((c) => {
    return {
      onOpen(evt, ws) {
        clientSocket = ws;
        console.log("Client connected");

        const connectionMessage: SystemMessage = {
          type: "system",
          category: "connection",
          timestamp: new Date().toISOString(),
          data: { status: "connected" },
        };
        ws.send(JSON.stringify(connectionMessage));
      },

      onMessage(evt, ws) {
        try {
          const message = JSON.parse(evt.data.toString());
          const parsed = VCCPMessageSchema.safeParse(message);

          if (!parsed.success) {
            throw new Error("Invalid message format");
          }

          handleMessage(parsed.data, ws);
        } catch (error) {
          console.error("Invalid message:", error);
          ws.send(
            JSON.stringify({
              type: "system",
              category: "error",
              timestamp: new Date().toISOString(),
              data: {
                error: "Invalid message format",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
            })
          );
        }
      },

      onClose(evt, ws) {
        console.log("Client disconnected");
        clientSocket = null;
      },

      onError(evt, ws) {
        console.error("WebSocket error:", evt);
      },
    };
  })
);

app.get("/", (c) => {
  return c.json({
    name: "VCCP Server",
    version: "1.0.0",
    protocol: "vccp-1.0",
    endpoint: "/vccp",
    connected: !!clientSocket,
  });
});

function handleMessage(message: VCCPMessage, ws: WSContext) {
  console.log(`Message received:`, message);

  switch (message.type) {
    case "perception":
      handlePerception(message as PerceptionData);
      break;
    default:
      console.warn(`Unknown message type: ${message.type}`);
  }
}

function handlePerception(perception: PerceptionData) {
  console.log("Perception received:", perception.category);

  if (clientSocket) {
    const data = {
      type: "perception",
      category: perception.category,
      timestamp: new Date().toISOString(),
      data: perception.data,
    };

    const parsed = VCCPMessageSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Invalid perception data:", parsed.error);
      return;
    }

    clientSocket.send(JSON.stringify(parsed.data));
  }
}

Bun.serve({
  fetch: app.fetch,
  websocket,
  port: 8000,
});

export default app;
