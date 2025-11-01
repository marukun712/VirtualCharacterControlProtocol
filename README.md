# VCCP(Virtual Character Control Protocol)

VCCPの実装は、[aikyo](https://github.com/marukun712/aikyo)に移動しました。

## 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [トランスポート層](#トランスポート層)
4. [メッセージフォーマット](#メッセージフォーマット)
5. [メッセージタイプ](#メッセージタイプ)

## 1. 概要

VCCP(Virtual Character Control Protocol)は、複数のLLMがP2Pネットワーク上で自然な会話を行うための通信プロトコルです。

## 2. アーキテクチャ

### 2.1 システム構成

```
┌─────────────────┐
│  Companion A    │
│  (libp2p node)  │
└────────┬────────┘
         │
         │ P2P Network (GossipSub)
         │
    ┌────┴────┐
    │         │
┌───▼─────┐ ┌▼────────┐      ┌──────────────┐
│Companion│ │Companion│◄─────►│  Firehose    │
│    B    │ │    C    │WebSock│  Server      │
└─────────┘ └─────────┘  et   └──────┬───────┘
                                      │
                                ┌─────▼──────┐
                                │  Clients   │
                                │ (Browser)  │
                                └────────────┘
```

### 2.2 コンポーネント

#### 2.2.1 Companion Agent
- **役割**: LLMの実行環境
- **主要機能**:
  - メッセージ生成・受信
  - ツール実行
  - メモリ管理(長期・作業記憶)

#### 2.2.2 Companion Server
- **役割**: libp2pベースのP2Pサーバー
- **主要機能**:
  - ピア管理
  - メッセージルーティング
  - ターンテイキング制御

#### 2.2.3 Firehose Server
- **役割**: WebSocketブリッジサーバー
- **主要機能**:
  - libp2p <-> WebSocketブリッジ
  - クライアント管理
  - トピックベースのルーティング

## 3. トランスポート層

### 3.1 libp2p設定

#### 3.1.1 トランスポート
- **TCP**: `/ip4/0.0.0.0/tcp/0`(動的ポート割り当て)

#### 3.1.2 ピアディスカバリー
- **mDNS**: ローカルネットワーク上の自動検出

#### 3.1.3 GossipSubプロトコル
- **GossipSub**: メッセージ配信
  - `allowPublishToZeroTopicPeers: true`
  - `emitSelf: true`(自己発信メッセージも受信)

### 3.2 トピック構造

VCCPでは以下の標準トピックを定義。

| トピック名 | 用途                         | メッセージタイプ   |
| ---------- | ---------------------------- | ------------------ |
| `messages` | 会話メッセージ               | Message            |
| `states`   | 状態通知                     | State              |
| `queries`  | クエリリクエスト・レスポンス | Query, QueryResult |
| `actions`  | クライアントアクション       | Action             |

### 3.3 カスタムプロトコル

#### 3.3.1 メタデータプロトコル
- **プロトコルID**: `/aikyo/metadata/1.0.0`
- **用途**: ピア接続時のコンパニオン情報交換
- **フロー**:
  ```
  Peer A                    Peer B
     |  dialProtocol           |
     |------------------------>|
     |                         |
     |  metadata JSON          |
     |<------------------------|
     |  stream.close           |
  ```

---

## 4. メッセージフォーマット

### 4.1 基本構造

全てのVCCPメッセージは**JSON-RPC 2.0**仕様に準拠します。

```typescript
interface VCCPMessage {
  jsonrpc: "2.0";
  method: string;
  params?: object;
  id?: string | number;
}
```

### 4.2 メタデータスキーマ

各コンパニオンは以下のメタデータを持ちます。

```typescript
interface Metadata {
  id: string;           // 一意の識別子
  name: string;         // 表示名
  personality: string;  // 性格記述
  story: string;        // 背景ストーリー
  sample: string;       // サンプル発言
}
```

---

## 5. メッセージタイプ

### 5.1 Message (会話メッセージ)

**用途**: コンパニオン間の会話内容を送信

**メソッド**: `message.send`

**スキーマ**:
```typescript
{
  jsonrpc: "2.0",
  method: "message.send",
  params: {
    id: string,              // メッセージID (UUID)
    from: string,            // 送信者ID
    to: string[],            // 宛先IDリスト
    message: string,         // メッセージ本文
    metadata?: {             // オプションメタデータ
      emotion?: "happy" | "sad" | "angry" | "neutral",
      [key: string]: any
    }
  }
}
```

**例**:
```json
{
  "jsonrpc": "2.0",
  "method": "message.send",
  "params": {
    "id": "dd3986c3-66f4-4f50-98cd-128f44faf9ee",
    "from": "companion_kyoko",
    "to": ["companion_aya", "companion_natsumi"],
    "message": "こんにちは!今日はどんなお話をしましょうか?",
    "metadata": {
      "emotion": "happy"
    }
  }
}
```

### 5.2 State (状態通知)

**用途**: ターンテイキングのための状態通知

**メソッド**: `state.send`

**スキーマ**:
```typescript
{
  jsonrpc: "2.0",
  method: "state.send",
  params: {
    from: string,                                    // コンパニオンID
    state: "speak" | "listen",                       // 発言意欲
    importance: number,                              // 重要度 (0-10)
    selected: boolean,                               // 指名されたか
    closing: "none" | "pre-closing" | "closing" | "terminal"  // 終了段階
  }
}
```

**フィールド詳細**:
- **state**: 
  - `speak`: 次に発言したい
  - `listen`: 聞く姿勢
- **importance**: 発言の重要度スコア(0-10)
- **selected**: 前回の発言で指名されたか
- **closing**: 会話の収束段階
  - `none`: 継続中
  - `pre-closing`: 終了への布石
  - `closing`: クロージング表現
  - `terminal`: 最終挨拶

**例**:
```json
{
  "jsonrpc": "2.0",
  "method": "state.send",
  "params": {
    "from": "companion_aya",
    "state": "speak",
    "importance": 7,
    "selected": false,
    "closing": "none"
  }
}
```

### 5.3 Query (クエリリクエスト)

**用途**: ネットワーク全体への情報要求(特定のノードが持っているデータをLLMに渡したい場合など)

**メソッド**: `query.send`

**スキーマ**:
```typescript
{
  jsonrpc: "2.0",
  method: "query.send",
  id: string,              // クエリID
  params: {
    from: string,          // 送信者ID
    type: string,          // クエリタイプ
    body?: {               // オプションパラメータ
      [key: string]: any
    }
  }
}
```

**例**:
```json
{
  "jsonrpc": "2.0",
  "method": "query.send",
  "id": "dd3986c3-66f4-4f50-98cd-128f44faf9ee",
  "params": {
    "from": "companion_kyoko",
    "type": "speak",
    "body": {
      "message": "準備できましたか?",
      "emotion": "neutral"
    }
  }
}
```

### 5.4 QueryResult (クエリレスポンス)

**用途**: クエリへの応答

**スキーマ**:
```typescript
{
  jsonrpc: "2.0",
  id: string,              // 対応するクエリID
  result?: {               // 成功時
    success: boolean,
    body: {
      [key: string]: any
    }
  },
  error?: string          // エラー時
}
```

**例(成功)**:
```json
{
  "jsonrpc": "2.0",
  "id": "dd3986c3-66f4-4f50-98cd-128f44faf9ee",
  "result": {
    "success": true,
    "body": {
      "ready": true,
    }
  }
}
```

**例(エラー)**:
```json
{
  "jsonrpc": "2.0",
  "id": "dd3986c3-66f4-4f50-98cd-128f44faf9ee",
  "error": "Timeout: クエリがタイムアウトしました"
}
```

### 5.5 Action (アクション通知)

**用途**: クライアント(3Dモデル、ロボット等)へのアクション指示

**メソッド**: `action.send`

**スキーマ**:
```typescript
{
  jsonrpc: "2.0",
  method: "action.send",
  params: {
    from: string,          // 送信者ID
    name: string,          // アクション名
    params: {              // アクションパラメータ
      [key: string]: any
    },
    metadata?: {           // オプションメタデータ
      [key: string]: any
    }
  }
}
```

**例**:
```json
{
  "jsonrpc": "2.0",
  "method": "action.send",
  "params": {
    "from": "companion_natsumi",
    "name": "display_reaction",
    "params": {
      "type": "surprised",
      "intensity": 8
    }
  }
}
```

クライアントは、定義したパラメータに応じてメッセージを解釈し、それぞれのユースケースに応じた処理を行う(例であれば、キャラクターの表情APIから表情を変更するなど)