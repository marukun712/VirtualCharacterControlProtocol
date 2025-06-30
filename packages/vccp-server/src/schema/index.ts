import { WSContext } from "hono/ws";
import { z } from "zod";

export const ActionSchema = z.object({
  $schema: z.string().optional(),
  $id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  type: z.literal("object"),
  properties: z.record(z.any()),
  required: z.array(z.string()).optional(),
});

export type Action = z.infer<typeof ActionSchema>;

export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.record(z.any()).optional(),
  id: z.union([z.string(), z.number()]).optional(),
});

export const RegisterRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("register"),
  params: z.object({
    actions: z.array(ActionSchema),
  }),
  id: z.union([z.string(), z.number()]).optional(),
});

export const ActionGetRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("action.get"),
  params: z.object({
    sessionId: z.string(),
  }),
  id: z.union([z.string(), z.number()]).optional(),
});

export const ActionPlayRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("action.play"),
  params: z.object({
    sessionId: z.string(),
    action: z.string(),
    properties: z.record(z.any()),
  }),
  id: z.union([z.string(), z.number()]).optional(),
});

export const PerceptionSetRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("perception.set"),
  params: z.object({
    sessionId: z.string(),
    category: z.string(),
    perception: z.string(),
  }),
  id: z.union([z.string(), z.number()]).optional(),
});

export const PerceptionCategoryRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("perception.category"),
  params: z.object({
    sessionId: z.string(),
    category: z.string(),
  }),
  id: z.union([z.string(), z.number()]).optional(),
});

export const PerceptionListRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("perception.list"),
  params: z.object({
    sessionId: z.string(),
  }),
  id: z.union([z.string(), z.number()]).optional(),
});

export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type ActionGetRequest = z.infer<typeof ActionGetRequestSchema>;
export type ActionPlayRequest = z.infer<typeof ActionPlayRequestSchema>;
export type PerceptionSetRequest = z.infer<typeof PerceptionSetRequestSchema>;
export type PerceptionCategoryRequest = z.infer<typeof PerceptionCategoryRequestSchema>;
export type PerceptionListRequest = z.infer<typeof PerceptionListRequestSchema>;

export type Perception = {
  category: string;
  perception: string;
};

export type Session = {
  ws: WSContext<WebSocket>;
  actions: Action[];
  perceptions: Perception[];
};
