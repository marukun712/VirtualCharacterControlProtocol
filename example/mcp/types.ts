import { z } from "zod";
import type { WebSocket } from "ws";

export const VCCPMessageSchema = z.object({
  type: z.enum(["perception", "action", "system"]),
  category: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
});

export type VCCPMessage = z.infer<typeof VCCPMessageSchema>;

export type Agent = {
  ws: WebSocket;
  capability: VCCPMessage;
  latestPerceptions: Map<string, VCCPMessage>;
};
