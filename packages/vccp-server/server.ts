import express from "express";
import expressWs from "express-ws";
import type { WebSocket } from "ws";
import { VCCPMessageSchema, type Agent, type VCCPMessage, type SessionManager } from "./types.js";

export class VCCPWebSocketServer implements SessionManager {
  private connectedClients: Set<WebSocket> = new Set();
  private agents: Map<string, Agent | null> = new Map();
  private sessions: Map<WebSocket, string> = new Map();

  setupWebSocketRoutes(app: expressWs.Application): void {
    app.ws("/vccp/:id", (ws: WebSocket, req) => {
      const sessionId = req.params.id;

      if (!sessionId) {
        console.error("WebSocket connection attempted without session ID");
        ws.close(1008, "Session ID required");
        return;
      }

      if (!this.agents.has(sessionId)) {
        console.error(
          `WebSocket connection attempted with unregistered session ID: ${sessionId}`
        );
        ws.close(1008, "Invalid session ID");
        return;
      }

      console.log(`WebSocket client connected with session ID: ${sessionId}`);
      this.connectedClients.add(ws);
      this.sessions.set(ws, sessionId);

      ws.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          this.handleMessage(parsed, ws, sessionId);
        } catch (error) {
          console.error("Failed to parse JSON message:", error);
        }
      });

      ws.on("close", () => {
        console.log(`Client disconnected from session: ${sessionId}`);
        this.connectedClients.delete(ws);
        this.sessions.delete(ws);
      });

      ws.on("error", (error) => {
        console.error(
          `WebSocket client error for session ${sessionId}:`,
          error
        );
        this.connectedClients.delete(ws);
        this.sessions.delete(ws);
      });
    });
  }

  registerAgent(sessionId: string): void {
    this.agents.set(sessionId, null);
  }

  getAgent(sessionId: string): Agent | null {
    return this.agents.get(sessionId) ?? null;
  }

  private handleMessage(data: unknown, ws: WebSocket, sessionId: string): void {
    console.log("Received raw message:", data, sessionId);

    const messageValidation = VCCPMessageSchema.safeParse(data);
    if (!messageValidation.success) {
      console.error("Invalid message format:", messageValidation.error);
      return;
    }

    const message = messageValidation.data;
    console.log("Validated message:", message);

    if (message.type === "perception") {
      const agent = this.agents.get(sessionId);
      if (!agent) {
        return;
      }
      agent.latestPerceptions.set(message.category, message);
      console.log("Stored perception data:", message.category, sessionId);
    }
    
    if (message.type === "system" && message.category === "capability") {
      this.agents.set(sessionId, {
        ws,
        capability: message,
        latestPerceptions: new Map(),
      });
    }
  }

  async sendActionToSession(sessionId: string, action: VCCPMessage): Promise<{
    success: boolean;
    message: string;
  }> {
    const agent = this.agents.get(sessionId);

    if (!agent) {
      return {
        success: false,
        message: `No client connected for session: ${sessionId}`,
      };
    }

    const client = agent.ws;

    if (client.readyState !== client.OPEN) {
      this.sessions.delete(client);
      this.agents.delete(sessionId);
      this.connectedClients.delete(client);
      return {
        success: false,
        message: `Client for session ${sessionId} is not connected`,
      };
    }

    try {
      client.send(JSON.stringify(action));
      console.log(`Action sent to session ${sessionId}:`, action);
      return {
        success: true,
        message: `Action sent to session: ${sessionId}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send action to session ${sessionId}: ${error}`,
      };
    }
  }

  getLatestPerception(sessionId: string): VCCPMessage[] | null {
    const agent = this.agents.get(sessionId);
    if (!agent) {
      return null;
    }
    const perception = [...agent.latestPerceptions.values()];
    return perception ?? null;
  }

  getCapability(sessionId: string): Record<string, any> | null {
    const agent = this.agents.get(sessionId);
    if (!agent) {
      return null;
    }
    const perception = agent.capability.data;
    return perception;
  }
}