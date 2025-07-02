import { z } from "zod";

export const ActionSchema = z.object({
  $schema: z.string().optional(),
  $id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  type: z.literal("object"),
  properties: z.record(z.any()),
});

export type Action = z.infer<typeof ActionSchema>;

export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.record(z.any()),
  id: z.union([z.string(), z.number()]).optional(),
});

export const RegisterRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("register"),
  params: z.object({
    actions: z.array(ActionSchema),
  }),
  id: z.union([z.string(), z.number()]),
});

export const ActionListRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("action.list"),
  params: z.object({
    sessionId: z.string(),
  }),
  id: z.union([z.string(), z.number()]),
});

export const ActionGetRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("action.get"),
  params: z.object({
    sessionId: z.string(),
    action: z.string(),
  }),
  id: z.union([z.string(), z.number()]),
});

export const ActionPlayRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("action.play"),
  params: z.object({
    sessionId: z.string(),
    action: z.string(),
    properties: z.record(z.any()),
  }),
  id: z.union([z.string(), z.number()]),
});

export const PerceptionSetRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("perception.set"),
  params: z.object({
    sessionId: z.string(),
    category: z.string(),
    perception: z.string(),
  }),
});

export const PerceptionCategoryRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("perception.category"),
  params: z.object({
    sessionId: z.string(),
    category: z.string(),
  }),
  id: z.union([z.string(), z.number()]),
});

export const PerceptionListRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("perception.list"),
  params: z.object({
    sessionId: z.string(),
  }),
  id: z.union([z.string(), z.number()]),
});

export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type ActionListRequest = z.infer<typeof ActionListRequestSchema>;
export type ActionGetRequest = z.infer<typeof ActionGetRequestSchema>;
export type ActionPlayRequest = z.infer<typeof ActionPlayRequestSchema>;
export type PerceptionSetRequest = z.infer<typeof PerceptionSetRequestSchema>;
export type PerceptionCategoryRequest = z.infer<
  typeof PerceptionCategoryRequestSchema
>;
export type PerceptionListRequest = z.infer<typeof PerceptionListRequestSchema>;

export const JSONRPCResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.any().optional(),
    })
    .optional(),
});

export const RegisterResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.object({
    sessionId: z.string(),
  }),
});

export const ActionListResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.object({
    actions: z.array(ActionSchema),
  }),
});

export const ActionGetResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: ActionSchema,
});

export const ActionPlayResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.object({
    success: z.boolean(),
  }),
});

export const PerceptionCategoryResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.object({
    perceptions: z.array(
      z.object({
        category: z.string(),
        perception: z.string(),
      })
    ),
  }),
});

export const PerceptionListResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.object({
    perceptions: z.array(
      z.object({
        category: z.string(),
        perception: z.string(),
      })
    ),
  }),
});

export type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type ActionListResponse = z.infer<typeof ActionListResponseSchema>;
export type ActionGetResponse = z.infer<typeof ActionGetResponseSchema>;
export type ActionPlayResponse = z.infer<typeof ActionPlayResponseSchema>;
export type PerceptionCategoryResponse = z.infer<
  typeof PerceptionCategoryResponseSchema
>;
export type PerceptionListResponse = z.infer<
  typeof PerceptionListResponseSchema
>;
