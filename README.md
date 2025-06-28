# VCCP (Virtual Character Control Protocol) v1.0

VCCP (Virtual Character Control Protocol) は、LLM (Large Language Model) が MCP (Model Context Protocol) を経由して VRM モデルを人間らしく操作するためのプロトコルです。WebSocket を基盤とし、双方向のリアルタイム通信により、知覚情報の受信と制御命令の送信を実現します。

## プロトコル仕様

### 基本アーキテクチャ

VCCPServer クラスが単一ポートで HTTP（MCP）と WebSocket サービスを統合提供：

- **MCP エンドポイント**: `POST /mcp` - LLM との通信
- **WebSocket エンドポイント**: `ws://host:port/vccp/:sessionId` - VRM クライアントとの通信

### VCCP メッセージフォーマット

```typescript
{
  type: "perception" | "action" | "system",
  category: string,
  timestamp: string, // ISO 8601形式
  data: Record<string, any>
}
```

### Capability（能力情報）

クライアントが実行可能なアクションをサーバーに登録するためのメッセージです。

```json
{
  "type": "system",
  "category": "capability",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "actions": [
      {
        "type": "action",
        "category": "movement",
        "data": { "target": { "x": 0.0, "y": 0.0, "z": 0.0 } }
      },
      {
        "type": "action",
        "category": "lookAt",
        "data": { "target": { "type": "position", "value": { "x": 0.0, "y": 0.0, "z": 0.0 } } }
      },
      {
        "type": "action",
        "category": "expression",
        "data": { "preset": "neutral" }
      }
    ]
  }
}
```

### Perception（知覚情報）

クライアントがサーバーに送信する環境認識情報です。

#### object（オブジェクト情報）

```json
{
  "type": "perception",
  "category": "object",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "name": "chair",
    "position": { "x": 0, "y": 0.5, "z": 0.5 },
    "description": "木製の椅子"
  }
}
```

#### environment（環境情報）

```json
{
  "type": "perception",
  "category": "environment",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "lighting": "bright",
    "temperature": "comfortable",
    "description": "明るい室内環境"
  }
}
```

### アクション例

以下はVRMキャラクターが実行可能なアクションの例です。クライアントはcapabilityメッセージでこれらのアクションを登録できます。

#### movement（移動制御）

```json
{
  "type": "action",
  "category": "movement",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "target": { "x": 1.0, "y": 0.0, "z": 2.0 }
  }
}
```

#### lookAt（視線制御）

```json
{
  "type": "action",
  "category": "lookAt",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "target": {
      "type": "position",
      "value": { "x": 1.0, "y": 1.6, "z": 2.0 }
    }
  }
}
```

#### expression（表情制御）

```json
{
  "type": "action",
  "category": "expression",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "preset": "happy|sad|angry|surprised|neutral"
  }
}
```

### MCP ツール

| ツール名         | 説明                                         | パラメータ          |
| ---------------- | -------------------------------------------- | ------------------- |
| `register-agent` | 新しい agent を登録し Session ID を生成      | なし                |
| `get-capability` | キャラクターの使用可能な action の定義を取得 | なし                |
| `get-perception` | 知覚情報を取得                               | なし                |
| `play-action`    | VRM キャラクターにアクションを実行           | action: VCCPMessage |

### 通信フロー

1. LLM が MCP 経由で`register-agent`ツールを実行して Session ID を取得
2. VRM クライアントが Session ID を使用して WebSocket エンドポイントに接続
3. クライアントが`capability`メッセージを送信してキャラクターの能力を登録
4. LLM が`play-action`ツールで VCCP メッセージを送信
5. サーバーが WebSocket 経由で対象セッションのクライアントにメッセージを送信
6. VRM クライアントがリアルタイムでキャラクター制御を実行

### ライブラリ構成

#### VCCPServer (`packages/vccp-server/`)

- Model Context Protocol (MCP) SDK を使用した LLM 連携サーバーライブラリ
- HTTP と WebSocket を 1 つのポートで統合提供
- Session ID ベースの WebSocket クライアント管理

**使用法:**

```typescript
import { VCCPServer } from "@vccp/server";

const server = new VCCPServer({
  port: 3000,
  host: "localhost",
});

// サーバー起動
await server.start();

// サーバー停止
await server.stop();
```

#### VCCPClient (`packages/vccp-client/`)

- WebSocket クライアントライブラリ
- VCCP メッセージの型定義とバリデーション機能
- TypeScript/Zod 対応

**使用法:**

```typescript
import { VCCPClient, type VCCPMessage } from "@vccp/client";

// クライアント作成
const client = new VCCPClient(
  {
    serverUrl: "ws://localhost:3000",
    sessionId: "your-session-id",
    autoConnect: true,
  },
  {
    onConnected: () => {
      console.log("WebSocket接続完了");
      
      // Capability送信
      client.sendCapabilityMessage([
        {
          type: "action",
          category: "movement",
          data: { target: { x: 0, y: 0, z: 0 } }
        }
      ]);
    },
    onMessageReceived: (message: VCCPMessage) => {
      console.log("メッセージ受信:", message);
      
      // アクション処理
      if (message.type === "action") {
        handleAction(message);
      }
    },
    onError: (error: Error) => {
      console.error("エラー:", error);
    }
  }
);

// 手動接続
await client.connect();

// 知覚情報送信
client.sendPerceptionMessage("object", {
  name: "chair",
  position: { x: 0, y: 0.5, z: 0.5 }
});

// 接続切断
await client.disconnect();
```
