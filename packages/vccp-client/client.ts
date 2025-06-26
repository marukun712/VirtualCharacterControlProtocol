import {
  VCCPMessageSchema,
  type VCCPMessage,
  type VCCPClientConfig,
  type VCCPClientCallbacks,
} from "./types.js";

export class VCCPClient {
  private ws: WebSocket | null = null;
  private config: VCCPClientConfig;
  private callbacks: VCCPClientCallbacks;
  private isConnected: boolean = false;

  constructor(config: VCCPClientConfig, callbacks: VCCPClientCallbacks = {}) {
    this.config = {
      serverUrl: config.serverUrl,
      sessionId: config.sessionId,
      autoConnect: config.autoConnect ?? true,
    };
    this.callbacks = callbacks;

    if (this.config.autoConnect && this.config.sessionId) {
      this.connect();
    }
  }

  connect() {
    if (!this.config.sessionId) {
      const error = new Error("Session ID is required to connect");
      this.callbacks.onError?.(error);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn("WebSocket is already connected");
      return;
    }

    const url = `${this.config.serverUrl}/vccp/${this.config.sessionId}`;

    try {
      this.ws = new WebSocket(url);
      this.setupWebSocketEventHandlers();
    } catch (error) {
      this.callbacks.onError?.(error as Error);
    }
  }

  private setupWebSocketEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log(
        `WebSocket connected with session ID: ${this.config.sessionId}`
      );
      this.isConnected = true;
      this.callbacks.onConnected?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsed = VCCPMessageSchema.safeParse(data);

        if (!parsed.success) {
          console.error("Invalid VCCP message format:", parsed.error);
          this.callbacks.onError?.(new Error("Invalid message format"));
          return;
        }

        this.callbacks.onMessageReceived?.(parsed.data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        this.callbacks.onError?.(error as Error);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed");
      this.isConnected = false;
      this.callbacks.onDisconnected?.();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.callbacks.onError?.(new Error("WebSocket connection error"));
    };
  }

  sendMessage(message: VCCPMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Failed to send message:", error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  sendCapabilityMessage(actions: any[]) {
    const capabilityMessage: VCCPMessage = {
      type: "system",
      category: "capability",
      timestamp: new Date().toISOString(),
      data: { actions },
    };

    const parsed = VCCPMessageSchema.safeParse(capabilityMessage);

    if (parsed.success) {
      return this.sendMessage(parsed.data);
    } else {
      console.error("Failed to send message:", parsed.error);
      this.callbacks.onError?.(parsed.error as Error);
    }
  }

  sendPerceptionMessage(category: string, data: Record<string, any>) {
    const perceptionMessage: VCCPMessage = {
      type: "perception",
      category,
      timestamp: new Date().toISOString(),
      data,
    };

    const parsed = VCCPMessageSchema.safeParse(perceptionMessage);

    if (parsed.success) {
      return this.sendMessage(parsed.data);
    } else {
      console.error("Failed to send message:", parsed.error);
      this.callbacks.onError?.(parsed.error as Error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }

  getSessionId(): string {
    return this.config.sessionId;
  }
}
