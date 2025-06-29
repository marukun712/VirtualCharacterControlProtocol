# VCCP (Virtual Character Control Protocol) 2.0

## 概要

VCCP は、LLM（Large Language Model）がバーチャルキャラクターを操作するための通信プロトコルです。JSON-RPC 2.0 形式を採用し、セッションベースでキャラクターの動作を制御します。

## プロトコル仕様

### メッセージフォーマット

すべての通信は JSON-RPC 2.0 形式に準拠します。

### API メソッド

#### 1. register - セッション登録

新しいセッションを開始し、利用可能なアクションを登録します。アクションのスキーマは以下のように定義されており、ユーザーは任意のアクションを登録することができます。

```json
{
  "name": string,
  "description": string,
  "params": Record<string,any>
}
```

**リクエスト例:**

```json
{
  "jsonrpc": "2.0",
  "method": "register",
  "params": {
    "actions": [
      {
        "name": "move",
        "description": "キャラクターを指定座標に移動",
        "params": {
          "x": "number",
          "y": "number",
          "z": "number"
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
  "result": {
    "sessionId": "uuid"
  }
}
```

#### 2. actions - アクション一覧取得

指定されたセッションで利用可能なアクションの一覧を取得します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "method": "actions",
  "params": {
    "sessionId": "uuid"
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "actions": [
      {
        "name": "move",
        "description": "キャラクターを指定座標に移動",
        "params": {
          "x": "number",
          "y": "number"
        }
      }
    ]
  }
}
```

#### 3. play - アクション実行

指定されたセッションで利用可能なアクションの一覧を取得します。
実行する action と ws クライアントはは register メソッドで登録されている必要があります。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "method": "play",
  "params": {
    "sessionId": "uuid",
    "action": "string"
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "success": true
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
