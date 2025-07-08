# VCCP (Virtual Character Control Protocol) 2.0

## 目次

- [概要](#概要)
- [アーキテクチャ](#アーキテクチャ)
- [プロトコル仕様](#プロトコル仕様)
  - [メッセージフォーマット](#メッセージフォーマット)
  - [API メソッド](#api-メソッド)
    - [1. register - セッション登録](#1-register---セッション登録)
    - [2. action.list - アクション一覧取得](#2-actionlist---アクション一覧取得)
    - [3. action.get - アクション取得](#3-actionget---アクション取得)
    - [4. action.play - アクション実行](#4-actionplay---アクション実行)
    - [5. perception.set - 知覚情報の記録](#5-perceptionset---知覚情報の記録)
    - [6. perception.category - 知覚情報の取得（カテゴリ別）](#6-perceptioncategory---知覚情報の取得カテゴリ別)
    - [7. perception.list - 知覚情報の一覧取得](#7-perceptionlist---知覚情報の一覧取得)
    - [8. scheduler.send](#8-schedulersend)
  - [利用フロー](#利用フロー)
  - [エラーハンドリング](#エラーハンドリング)

## 概要

VCCP は、LLM がバーチャルキャラクターを操作するための通信プロトコルです。JSON-RPC 2.0 形式を採用し、セッションベースでキャラクターの動作を制御します。

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Client      │    │  VCCP Server    │    │      LLM        │
│  (Game/App)     │    │  (Hono/WS)      │    │   (External)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │ 1. WebSocket Connect   │                        │
         │───────────────────────→│                        │
         │                        │                        │
         │ 2. register(actions)   │                        │
         │───────────────────────→│                        │
         │                        │                        │
         │ 3. sessionId           │                        │
         │←───────────────────────│                        │
         │                        │                        │
         │                        │ 4. action.get          │
         │                        │←───────────────────────│
         │                        │                        │
         │                        │ 5. available actions   │
         │                        │───────────────────────→│
         │                        │                        │
         │                        │ 6. action.play         │
         │                        │←───────────────────────│
         │                        │                        │
         │ 7. execute action      │                        │
         │←───────────────────────│                        │
         │                        │                        │
         │ 8. perception.set      │                        │
         │───────────────────────→│                        │
         │                        │                        │
         │                        │ 9. perception.category │
         │                        │←───────────────────────│
         │                        │                        │
         │                        │ 10. perception data    │
         │                        │───────────────────────→│
```

## プロトコル仕様

### メッセージフォーマット

すべての通信は JSON-RPC 2.0 形式に準拠します。

### API メソッド

#### 1. register - セッション登録

新しいセッションを開始し、利用可能なアクションを登録します。アクションのスキーマは JSON Schema で記述され、ユーザーは任意のアクションを登録できます。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "register",
  "params": {
    "actions": [
      {
        "title": "move",
        "description": "キャラクターを指定した座標に移動させる",
        "type": "object",
        "properties": {
          "x": {
            "description": "x座標",
            "type": "integer"
          },
          "y": {
            "description": "y座標",
            "type": "integer"
          },
          "z": {
            "description": "z座標",
            "type": "integer"
          }
        }
      }
    ]
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "sessionId": "uuid"
  }
}
```

#### 2. action.list - アクション一覧取得

指定されたセッションで利用可能なアクションの一覧を取得します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "action.list",
  "params": {
    "sessionId": "uuid"
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "actions": [
      {
        "title": "move",
        "description": "キャラクターを指定した座標に移動させる",
        "type": "object",
        "properties": {
          "x": {
            "description": "x座標",
            "type": "integer"
          },
          "y": {
            "description": "y座標",
            "type": "integer"
          },
          "z": {
            "description": "z座標",
            "type": "integer"
          }
        }
      }
    ]
  }
}
```

#### 3. action.get - アクション取得

指定されたアクションの詳細スキーマを取得します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "action.get",
  "params": {
    "sessionId": "uuid",
    "action": "move"
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "title": "move",
    "description": "キャラクターを指定した座標に移動させる",
    "type": "object",
    "properties": {
      "x": {
        "description": "x座標",
        "type": "integer"
      },
      "y": {
        "description": "y座標",
        "type": "integer"
      },
      "z": {
        "description": "z座標",
        "type": "integer"
      }
    }
  }
}
```

#### 4. action.play - アクション実行

指定されたアクションを実行します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "action.play",
  "params": {
    "sessionId": "uuid",
    "action": "move",
    "properties": {
      "x": 5,
      "y": 0,
      "z": 5
    }
  }
}
```

クライアント側にこのようなメッセージが送信されます。

```json
{
  "type": "play",
  "action": "move",
  "properties": {
    "x": 5,
    "y": 0,
    "z": 5
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true
  }
}
```

#### 5. perception.set - 知覚情報の記録

セッションごとに知覚情報を自然言語で記録し、LLM に伝達します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "method": "perception.set",
  "params": {
    "sessionId": "uuid",
    "category": "object",
    "perception": "椅子がx:2,y:2,z:0にあります"
  }
}
```

#### 6. perception.category - 知覚情報の取得（カテゴリ別）

指定されたカテゴリの知覚情報を取得します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "perception.category",
  "params": {
    "sessionId": "uuid",
    "category": "object"
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "perceptions": [
      { "category": "object", "perception": "椅子がx:2,y:2,z:0にあります" }
    ]
  }
}
```

#### 7. perception.list - 知覚情報の一覧取得

セッションに保存されているすべての知覚情報を取得します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "perception.list",
  "params": {
    "sessionId": "uuid"
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "perceptions": [
      { "category": "object", "perception": "椅子がx:2,y:2,z:0にあります" }
    ]
  }
}
```

#### 8 scheduler.send

複数のアクション実行をリクエストします。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "scheduler.send",
  "params": {
    "sessionId": "uuid",
    "duration": 10,
    "actions": [
      {
        "time": 1,
        "action": "move",
        "properties": {
          "x": 2,
          "y": 0,
          "z": 2
        }
      },
      {
        "time": 5,
        "action": "move",
        "properties": {
          "x": -2,
          "y": 0,
          "z": -2
        }
      }
      {
        "time": 10,
        "action": "move",
        "properties": {
          "x": 0,
          "y": 0,
          "z": 0
        }
      }
    ]
  }
}
```

クライアント側にこのようなメッセージが送信されます。

```json
{
  "type": "scheduler",
  "duration": 10,
  "actions": [
    {
      "time": 1,
      "action": "move",
      "properties": {
        "x": 2,
        "y": 0,
        "z": 2
      }
    },
    {
      "time": 5,
      "action": "move",
      "properties": {
        "x": -2,
        "y": 0,
        "z": -2
      }
    },
    {
      "time": 10,
      "action": "move",
      "properties": {
        "x": 0,
        "y": 0,
        "z": 0
      }
    }
  ]
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true
  }
}
```

### 利用フロー

1. クライアントは `register` メソッドを呼び出し、実行可能なアクションを登録
2. サーバーはセッション ID を返却
3. クライアントは必要に応じて `action.list` メソッドでアクション一覧を確認
4. セッション ID を使用して、`action.play` や `perception.set` などのメソッドを呼び出し、バーチャルキャラクターの操作を継続

### エラーハンドリング

JSON-RPC 2.0 標準のエラーフォーマットに従います：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params"
  }
}
```
