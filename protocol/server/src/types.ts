import { z } from "zod";

// 基本メッセージスキーマ
export const VCCPMessageSchema = z.object({
  type: z.enum(["perception", "action", "system"]),
  category: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
});

export type VCCPMessage = z.infer<typeof VCCPMessageSchema>;

// 知覚情報スキーマ
export const PerceptionDataSchema = z.object({
  type: z.literal("perception"),
  category: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
});

export type PerceptionData = z.infer<typeof PerceptionDataSchema>;

// 視覚情報
export const VisionPerceptionSchema = z.object({
  type: z.literal("perception"),
  category: z.literal("vision"),
  timestamp: z.string(),
  data: z.object({
    image: z.string(),
    format: z.enum(["jpeg", "png"]),
    resolution: z.object({
      width: z.number(),
      height: z.number(),
    }),
    fov: z.number().optional(),
  }),
});

// 環境情報
export const EnvironmentPerceptionSchema = z.object({
  type: z.literal("perception"),
  category: z.literal("environment"),
  timestamp: z.string(),
  data: z.object({
    objects: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["furniture", "person", "object"]),
        name: z.string(),
        position: z.object({
          x: z.number(),
          y: z.number(),
          z: z.number(),
        }),
      })
    ),
  }),
});

// ユーザー状態
export const UserPerceptionSchema = z.object({
  type: z.literal("perception"),
  category: z.literal("user"),
  timestamp: z.string(),
  data: z.object({
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
    activity: z.string().optional(),
  }),
});

// 制御命令スキーマ
export const ActionDataSchema = z.object({
  type: z.literal("action"),
  category: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
});

export type ActionData = z.infer<typeof ActionDataSchema>;

// 移動制御
export const MovementActionSchema = z.object({
  type: z.literal("action"),
  category: z.literal("movement"),
  timestamp: z.string(),
  data: z.object({
    target: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
    speed: z.number().optional().default(1.0),
  }),
});

// 視線制御
export const LookAtActionSchema = z.object({
  type: z.literal("action"),
  category: z.literal("lookAt"),
  timestamp: z.string(),
  data: z.object({
    target: z.object({
      type: z.enum(["position", "object"]),
      value: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
    }),
  }),
});

// 表情制御
export const ExpressionActionSchema = z.object({
  type: z.literal("action"),
  category: z.literal("expression"),
  timestamp: z.string(),
  data: z.object({
    preset: z.enum([
      "a",
      "e",
      "i",
      "o",
      "u",
      "blink",
      "joy",
      "angry",
      "sorrow",
      "fun",
      "lookup",
      "lookdown",
      "lookleft",
      "lookright",
      "blink_l",
      "blink_r",
      "neutral",
    ]),
  }),
});

// ジェスチャー制御
export const AnimActionSchema = z.object({
  type: z.literal("action"),
  category: z.literal("anim"),
  timestamp: z.string(),
  data: z.object({
    bvh: z.string(),
  }),
});

// システムメッセージ
export const SystemMessageSchema = z.object({
  type: z.literal("system"),
  category: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
});

export type SystemMessage = z.infer<typeof SystemMessageSchema>;

// 接続管理
export const ConnectionSystemSchema = z.object({
  type: z.literal("system"),
  category: z.literal("connection"),
  timestamp: z.string(),
  data: z.object({
    status: z.enum(["connected", "disconnected", "error"]),
    clientId: z.string(),
  }),
});

// カスタム知覚情報/制御命令の登録スキーマ
export const CustomRegistrationSchema = z.object({
  type: z.enum(["perception", "action"]),
  name: z.string(),
  schema: z.record(z.any()),
});

// WebSocketクライアント情報
export const ClientInfoSchema = z.object({
  id: z.string(),
  connected: z.boolean(),
  lastSeen: z.string(),
  userAgent: z.string().optional(),
});

export type ClientInfo = z.infer<typeof ClientInfoSchema>;
