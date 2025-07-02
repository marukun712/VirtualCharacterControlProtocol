# VCCP Client

VCCP (Virtual Character Control Protocol) の TypeScript クライアントライブラリです。WebSocket を使用して VCCP サーバーと通信し、バーチャルキャラクターの操作を行うことができます。

## インストール

```bash
bun add vccp-client
```

## 基本的な使用方法

### 1. クライアントの初期化と接続

```typescript
import { VCCPClient } from "vccp-client";

const client = new VCCPClient({ url: "ws://localhost:3000/ws" });

// サーバーに接続
await client.connect();
```

### 2. アクションの登録

セッションを開始し、利用可能なアクションを登録します：

```typescript
const actions = [
  {
    title: "move",
    description: "キャラクターを指定した座標に移動させる",
    type: "object" as const,
    properties: {
      x: {
        description: "x座標",
        type: "integer"
      },
      y: {
        description: "y座標", 
        type: "integer"
      },
      z: {
        description: "z座標",
        type: "integer"
      }
    }
  }
];

const response = await client.register(actions);
const sessionId = response.result.sessionId;
```

### 3. アクションの取得と実行

```typescript
// 利用可能なアクション一覧を取得
const actionList = await client.listActions(sessionId);
console.log(actionList.result.actions);

// 特定のアクションの詳細を取得
const actionDetail = await client.getAction(sessionId, "move");
console.log(actionDetail.result);

// アクションを実行
const result = await client.playAction(sessionId, "move", {
  x: 5,
  y: 0,
  z: 5
});
console.log(result.result.success); // true
```

### 4. 知覚情報の管理

```typescript
// 知覚情報を記録（レスポンスなし）
client.setPerception(sessionId, "object", "椅子がx:2,y:2,z:0にあります");

// カテゴリ別の知覚情報を取得
const perceptions = await client.getPerceptionByCategory(sessionId, "object");
console.log(perceptions.result.perceptions);

// すべての知覚情報を取得
const allPerceptions = await client.listPerception(sessionId);
console.log(allPerceptions.result.perceptions);
```

## API リファレンス

### VCCPClient

#### コンストラクタ

```typescript
new VCCPClient(config: { url: string })
```

- `config.url`: VCCP サーバーの WebSocket URL

#### メソッド

##### `connect(): Promise<string>`

VCCP サーバーに接続します。

##### `register(actions: Action[]): Promise<RegisterResponse>`

新しいセッションを開始し、利用可能なアクションを登録します。

- `actions`: 登録するアクションの配列（JSON Schema 形式）
- 戻り値: セッション ID を含むレスポンス

##### `listActions(sessionId: string): Promise<ActionListResponse>`

指定したセッションで利用可能なアクション一覧を取得します。

##### `getAction(sessionId: string, name: string): Promise<ActionGetResponse>`

特定のアクションの詳細スキーマを取得します。

##### `playAction(sessionId: string, name: string, params: Record<string, any>): Promise<ActionPlayResponse>`

指定したアクションを実行します。

- `params`: アクションに渡すパラメータ

##### `setPerception(sessionId: string, category: string, perception: string): void`

知覚情報を記録します（非同期、レスポンスなし）。

##### `getPerceptionByCategory(sessionId: string, category: string): Promise<PerceptionCategoryResponse>`

指定したカテゴリの知覚情報を取得します。

##### `listPerception(sessionId: string): Promise<PerceptionListResponse>`

セッションのすべての知覚情報を取得します。

## 完全な使用例

```typescript
import { VCCPClient } from "vccp-client";

async function main() {
  // クライアントを初期化
  const client = new VCCPClient({ url: "ws://localhost:3000/ws" });
  
  try {
    // サーバーに接続
    await client.connect();
    console.log("VCCPサーバーに接続しました");
    
    // アクションを定義
    const actions = [
      {
        title: "move",
        description: "キャラクターを移動させる",
        type: "object" as const,
        properties: {
          x: { type: "integer", description: "x座標" },
          y: { type: "integer", description: "y座標" }
        }
      }
    ];
    
    // セッションを登録
    const registerResponse = await client.register(actions);
    const sessionId = registerResponse.result.sessionId;
    console.log("セッション ID:", sessionId);
    
    // アクションを実行
    const moveResult = await client.playAction(sessionId, "move", {
      x: 10,
      y: 20
    });
    console.log("移動結果:", moveResult.result.success);
    
    // 知覚情報を記録
    client.setPerception(sessionId, "location", "キャラクターは座標(10, 20)に移動しました");
    
    // 知覚情報を取得
    const perceptions = await client.listPerception(sessionId);
    console.log("知覚情報:", perceptions.result.perceptions);
    
  } catch (error) {
    console.error("エラーが発生しました:", error);
  }
}

main();
```

## エラーハンドリング

すべての非同期メソッドは JSON-RPC 2.0 のエラーレスポンスを投げる可能性があります：

```typescript
try {
  const result = await client.playAction(sessionId, "invalidAction", {});
} catch (error) {
  console.error("JSON-RPC エラー:", error);
  // error オブジェクトには jsonrpc, id, error プロパティが含まれます
}
```

## 型定義

このライブラリは完全な TypeScript 型定義を提供しています。すべてのリクエストとレスポンスの型は `vccp-client` からエクスポートされています：

```typescript
import type { 
  Action, 
  RegisterResponse, 
  ActionPlayResponse,  
  PerceptionCategoryResponse 
} from "vccp-client";
```

## MCP との統合例

Model Context Protocol (MCP) との統合例は `examples/mcp` ディレクトリを参照してください。
