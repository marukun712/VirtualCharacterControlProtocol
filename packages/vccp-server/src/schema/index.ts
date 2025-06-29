import { WSContext } from "hono/ws";
import { z } from "zod";

export const ActionSchema = z.object({
  name: z.string(),
  description: z.string(),
  params: z.record(z.any()),
});

export type Action = z.infer<typeof ActionSchema>;

export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.record(z.any()).optional(),
});

export const RegisterRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("register"),
  params: z.object({
    actions: z.array(ActionSchema),
  }),
});

export const ActionsRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("actions"),
  params: z.object({
    sessionId: z.string(),
  }),
});

export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type ActionsRequest = z.infer<typeof ActionsRequestSchema>;

export type Session = {
  ws: WSContext<WebSocket>;
  actions: Action[];
};
