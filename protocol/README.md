# VCCP Prototype Server

VRM Character Control Protocol (VCCP) v1.0 のプロトタイプ実装です。

## 構成

- **TypeScript + Hono + Bun**: 高速なWebSocketサーバー
- **JSON-RPC 2.0**: 標準的な通信プロトコル
- **プラグインシステム**: 拡張可能なアーキテクチャ

## 機能

### コアAPI
- `core.execute` - アクション実行
- `context.set` - コンテキスト管理  
- `plugin.register` - プラグイン登録

### 標準アクション
- `motion` - モーション制御
- `expression` - 表情制御
- `speech` - 音声制御

### 内蔵プラグイン
- `ai_motion.generate` - AI駆動モーション生成
- `emotion.analyze` - 感情分析
- `gesture.generate` - ジェスチャー生成

## Getting Started

```sh
bun install
bun run dev
```

http://localhost:3000 でテストクライアントが利用できます。

## WebSocket接続

```
ws://localhost:3000/vccp
```

## 使用例

### 基本アクション実行
```json
{
  "jsonrpc": "2.0",
  "method": "core.execute",
  "params": {
    "action": "motion",
    "data": { "type": "name", "value": "wave" },
    "context": { "emotion": "happy" }
  },
  "id": 1
}
```

### プラグイン使用
```json
{
  "jsonrpc": "2.0", 
  "method": "core.execute",
  "params": {
    "action": "ai_motion.generate",
    "data": { 
      "prompt": "驚いて後ずさりする",
      "style": "realistic"
    },
    "context": { "current_pose": "standing" }
  },
  "id": 2
}
```
