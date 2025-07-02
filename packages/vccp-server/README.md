# VCCP Server

VCCP (Virtual Character Control Protocol) のサーバー実装です。JSON-RPC 2.0 プロトコルを使用して LLM と仮想キャラクターの制御を仲介します。

## 概要

VCCP Server は、WebSocket を使用してリアルタイムの双方向通信を提供し、セッションベースのアーキテクチャで複数のクライアントを管理します。

## 開発

### 依存関係のインストール

```bash
bun i
```

### 開発サーバーの起動

```bash
bun run dev
```

サーバーはデフォルトでポート 3000 で起動します。WebSocket エンドポイントは `ws://localhost:3000/ws` でアクセスできます。
