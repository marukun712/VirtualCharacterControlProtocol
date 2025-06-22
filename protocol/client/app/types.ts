import { z } from "zod";

export const VCCPMessageSchema = z.object({
  type: z.enum(["perception", "action", "system"]),
  category: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
});

export type VCCPMessage = z.infer<typeof VCCPMessageSchema>;
