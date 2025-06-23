# VCCP (Virtual Character Control Protocol) v1.0

## 1. 概要

VCCP (Virtual Character Control Protocol) は、LLM (Large Language Model) が MCP (Model Context Protocol) を経由して VRM モデルを人間らしく操作するためのプロトコルです。WebSocket を基盤とし、双方向のリアルタイム通信により、知覚情報の受信と制御命令の送信を実現します。

### 1.1 設計原則

- **シンプルさ**: 最小限の仕様で最大限の表現力を実現
- **拡張性**: ユーザーが独自の知覚情報や制御命令を追加可能
- **リアルタイム性**: 低遅延での双方向通信
- **人間らしさ**: 自然な動作とインタラクションの実現

## 2. アーキテクチャ

```
┌─────────────┐     MCP      ┌──────────────────┐    WebSocket    ┌─────────────┐
│     LLM     │◄────────────►│  VCCP Server     │◄───────────────►│   Client    │
│             │              │   (Port 3000)    │                 │   (VRM)     │
└─────────────┘              └──────────────────┘                 └─────────────┘
```

### 2.1 統合アーキテクチャ

VCCP サーバーは 1 つの Express アプリケーションで HTTP と WebSocket を統合提供します：

- **Port 3000**: HTTP MCP サーバー（LLM との通信）+ WebSocket サーバー（VRM クライアントとの通信）
- **エンドポイント**: `ws://localhost:3000/vccp/:sessionId`
- **セッション管理**: Session ID によるクライアント管理とメッセージルーティング

## 3. メッセージ仕様

### 3.1 基本構造

全ての VCCP メッセージは以下の基本構造に従います：

```typescript
interface VCCPMessage {
  type: "perception" | "action" | "system";
  category: string;
  timestamp: string; // ISO 8601形式
  data: Record<string, any>;
}
```

### 3.2 メッセージタイプ

#### 3.2.1 System メッセージ

システム情報や能力情報の交換に使用されます。

**Capability（能力情報）**

```typescript
{
  type: "system",
  category: "capability",
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    actions: [
      // サポートされるアクションの定義
    ]
  }
}
```

#### 3.2.2 Perception メッセージ

クライアントからサーバーへの知覚情報送信に使用されます。

```typescript
{
  type: "perception",
  category: string, // 知覚情報のカテゴリ
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    // カテゴリ固有の知覚データ
  }
}
```

#### 3.2.3 Action メッセージ

サーバーからクライアントへの制御命令送信に使用されます。

**Movement（移動制御）**

```typescript
{
  type: "action",
  category: "movement",
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    target: {
      x: number,
      y: number,
      z: number
    },
    speed?: number
  }
}
```

**LookAt（視線制御）**

```typescript
{
  type: "action",
  category: "lookAt",
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    target: {
      type: "position" | "object",
      value: {
        x: number,
        y: number,
        z: number
      }
    }
  }
}
```

**Expression（表情制御）**

```typescript
{
  type: "action",
  category: "expression",
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    preset: string // "happy", "angry", "sad", "neutral" など
  }
}
```

## 4. MCP ツール仕様

### 4.1 実装済みツール

**register-agent**

- 説明: 新しい agent を登録します。WebSocket クライアントはこの Session ID を使って接続する必要があります。
- パラメータ: なし（Session ID は自動生成）
- 戻り値: 登録された Session ID

**get-capability**

- 説明: キャラクターが使用可能な action の定義を取得します。
- パラメータ: なし（Session ID ヘッダーから取得）
- 戻り値: 能力情報の JSON

**get-perception**

- 説明: 知覚情報を取得します
- パラメータ:
  - `category`: 知覚情報のカテゴリ (string)
- 戻り値: 指定されたカテゴリの最新知覚情報

**play-action**

- 説明: VRM キャラクターにアクションをさせます。
- パラメータ:
  - `action`: VCCP メッセージ形式のアクション (Record<string, any>)
- 戻り値: 実行結果

### 4.2 セッション管理

- **Session ID**: MCP セッション初期化時に自動生成
- **WebSocket 接続**: `ws://localhost:3000/vccp/:sessionId`
- **認証**: Session ID による接続認証
- **ライフサイクル**: WebSocket 接続/切断の自動管理

## 5. 接続フロー

1. **MCP セッション開始**: LLM が MCP サーバーに接続
2. **Agent 登録**: `register-agent`ツールでセッションを登録
3. **WebSocket 接続**: クライアントが Session ID を使用して接続
4. **能力情報送信**: クライアントが`capability`メッセージを送信
5. **通信開始**: LLM がアクションを送信、クライアントが実行
