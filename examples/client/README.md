# VCCP Test Client

VCCP (Virtual Character Control Protocol) サーバーをテストするための Web ベースのクライアントアプリケーションです。ブラウザ上で VCCP サーバーとの通信をテストできます。

## 概要

VCCP Test Client は、VCCP サーバーの動作を確認するための対話型 Web アプリケーションです。WebSocket を使用して VCCP サーバーに直接接続し、各種メソッドをテストできます。

## 主な機能

- **WebSocket 接続管理**: サーバーへの接続・切断を GUI で操作
- **メソッドテスト**: 全ての VCCP メソッドを対話的にテスト
- **プリセットメッセージ**: よく使用されるメッセージのテンプレート
- **リアルタイムログ**: 送受信したメッセージをリアルタイムで表示
- **セッション管理**: 登録後のセッション ID を自動的に管理
- **レスポンシブデザイン**: PC・モバイル両対応の UI

## 使用方法

### 依存関係のインストール

```bash
bun install
```

### 開発サーバーの起動

```bash
bun run dev
```

ブラウザで `http://localhost:8000` にアクセスしてテストクライアントを開きます。

### 基本的な使用手順

1. **サーバー接続**

   - VCCP サーバーが `ws://localhost:3000/ws` で起動していることを確認
   - 「接続」ボタンをクリックして WebSocket 接続を確立

2. **セッション作成**

   - 「サンプル登録」プリセットボタンをクリック
   - 「送信」ボタンでアクションを登録してセッションを作成
   - レスポンスからセッション ID が自動的に取得される

3. **アクションテスト**
   - プリセットボタンで各種メソッドをテスト
   - パラメータは手動で編集可能
   - `SESSION_ID` プレースホルダーは自動的に現在のセッション ID に置換

## 対応メソッド

### register

アクションを登録してセッションを作成します。

```json
{
  "actions": [
    {
      "title": "move",
      "description": "キャラクターを指定した座標に移動させる",
      "type": "object",
      "properties": {
        "x": { "type": "integer" },
        "y": { "type": "integer" },
        "z": { "type": "integer" }
      }
    }
  ]
}
```

### action.list / action.get

登録されたアクションの一覧または詳細を取得します。

```json
{
  "sessionId": "your-session-id"
}
```

### action.play

アクションを実行します。

```json
{
  "sessionId": "your-session-id",
  "action": "move",
  "properties": { "x": 5, "y": 0, "z": 5 }
}
```

### perception.set

知覚情報を記録します。

```json
{
  "sessionId": "your-session-id",
  "category": "object",
  "perception": "椅子がx:2,y:2,z:0にあります"
}
```

### perception.category / perception.list

知覚情報を取得します。

```json
{
  "sessionId": "your-session-id",
  "category": "object"
}
```

## UI 機能

### 接続管理

- **サーバー URL 入力**: 接続先の WebSocketURL を指定
- **接続/切断ボタン**: WebSocket 接続の開始・終了
- **接続状態表示**: 現在の接続状態をビジュアル表示

### メッセージ送信

- **メソッド選択**: プルダウンで送信するメソッドを選択
- **パラメータ入力**: JSON 形式でリクエストパラメータを入力
- **送信ボタン**: メッセージをサーバーに送信

### プリセット機能

- **サンプル登録**: move アクションを含む基本的なセッション作成
- **各種テスト**: 全メソッドのテンプレートメッセージ
- **自動置換**: `SESSION_ID`プレースホルダーの自動置換

### ログ機能

- **送信メッセージ**: 青色でハイライト表示
- **受信メッセージ**: 紫色でハイライト表示
- **エラーメッセージ**: 赤色でハイライト表示
- **タイムスタンプ**: 各メッセージに時刻を表示
- **ログクリア**: ログをクリアするボタン

## 開発・デバッグ

### ログ確認

ブラウザの開発者ツールでより詳細なデバッグ情報を確認できます。

### カスタムメッセージ

プリセット以外にも、パラメータ欄に直接 JSON を入力してカスタムメッセージを送信できます。

### セッション管理

登録後のセッション ID は自動的に保存され、後続のリクエストで自動的に使用されます。

## 技術スタック

- **Frontend**: Vanilla JavaScript + HTML/CSS
- **Backend**: Hono framework (Bun runtime)
- **通信**: WebSocket (JSON-RPC 2.0)
- **UI**: レスポンシブデザイン (CSS Grid)
