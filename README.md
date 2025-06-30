# VCCP (Virtual Character Control Protocol) 2.0

## 概要

VCCP は、LLM がバーチャルキャラクターを操作するための通信プロトコルです。JSON-RPC 2.0 形式を採用し、セッションベースでキャラクターの動作を制御します。

## プロトコル仕様

### メッセージフォーマット

すべての通信は JSON-RPC 2.0 形式に準拠します。

### API メソッド

#### 1. register - セッション登録

新しいセッションを開始し、利用可能なアクションを登録します。アクションのスキーマは JSON Schema で記述され 、ユーザーは任意のアクションを登録することができます。

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

#### 2. action.get - アクション一覧取得

指定されたセッションで利用可能なアクションの一覧を取得します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "action.get",
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

#### 3. action.play - アクション実行

指定されたセッションで利用可能なアクションの一覧を取得します。
実行する action と ws クライアントは register メソッドで登録されている必要があります。

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

#### 4. perception.set - 知覚情報の記録

ユーザーは、セッションごとに知覚情報を自然言語で記録して、LLM に伝えることができます。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "perception.set",
  "params": {
    "sessionId": "uuid",
    "category": "object",
    "perception": "椅子がx:2,y:2,z:0にあります"
  }
}
```

#### 5. perception.category - 知覚情報の取得(カテゴリごと)

カテゴリごとの最新の知覚情報を取得することができます。

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
    "perception": "椅子がx:2,y:2,z:0にあります"
  }
}
```

#### 6. perception.list - 知覚情報の一覧取得

セッションで保持されている知覚情報をすべて取得することができます。

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

### 利用フロー

1. クライアントは`register`メソッドを呼び出し、実行可能なアクションを登録
2. サーバーはセッション ID を返却
3. クライアントは必要に応じて`actions`メソッドでアクション一覧を確認
4. セッション ID を使用して、バーチャルキャラクターの操作を継続

### エラーハンドリング

JSON-RPC 2.0 標準のエラーフォーマットに従います：

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params"
  }
}
```
