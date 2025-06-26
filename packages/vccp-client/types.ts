import { z } from "zod";

export const VCCPMessageSchema = z.object({
  type: z.enum(["perception", "action", "system"]),
  category: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
});

export type VCCPMessage = z.infer<typeof VCCPMessageSchema>;

export interface VCCPClientConfig {
  serverUrl: string;
  sessionId: string;
  autoConnect?: boolean;
}

export interface VCCPClientCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessageReceived?: (message: VCCPMessage) => void;
  onError?: (error: Error) => void;
}
