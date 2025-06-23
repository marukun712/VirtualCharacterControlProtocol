# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

必ず日本語で回答してください。

## 開発コマンド

### MCP Server（MCPプロトコル実装 + WebSocketサーバー統合）
```bash
cd protocol/mcp
bun install
bun run index.ts  # Port 3000で HTTP (MCP) + WebSocket 統合サーバー起動
```

### VRM Client（HonoX + Three.js）
```bash
cd protocol/client
bun install
bun run dev     # Vite開発サーバー起動（http://localhost:5173）
bun run build   # 本番ビルド（クライアント＋サーバー両方）
bun run preview # Wrangler経由でプレビュー
bun run deploy  # Cloudflare Workersにデプロイ
```

### 開発時の起動順序
1. MCPサーバーを先に起動（Port 3000）
2. VRMクライアント開発サーバーを起動（Port 5173）
3. ブラウザで `http://localhost:5173?sessionId=<session-id>` にアクセス

## アーキテクチャ概要

このプロジェクトは VCCP (VRM Character Control Protocol) の実装で、以下の2つの主要コンポーネントから構成されている：

### 1. MCP Server (`protocol/mcp/`)
- Model Context Protocol (MCP) SDK を使用したLLM連携サーバー
- **統合アーキテクチャ**: 1つのExpressアプリケーションでHTTPとWebSocketを統合提供
  - Port 3000: HTTP MCP サーバー（LLMとの通信）+ WebSocket サーバー（VRMクライアントとの通信）
- VCCP v1.0に準拠した5つのツールを提供（実装済み）
- WebSocketクライアント管理とメッセージブロードキャスト機能

### 2. VRM Client (`protocol/client/`)
- HonoX + Three.js + @pixiv/three-vrm による3Dキャラクター表示
- WebSocket経由でVCCPメッセージを受信しリアルタイムキャラクター制御
- Cloudflare Workersへのデプロイメント対応
- 室内環境の3D空間とインタラクション機能
- エンドポイント: `ws://localhost:3000/vccp` に接続

### プロトコル仕様
- `protocol.md` にVCCP v1.0の詳細仕様を記載
- WebSocketベースの双方向リアルタイム通信
- 知覚情報（perception）と制御命令（action）の定義
- カスタム拡張可能な設計

### 技術スタック
**共通:**
- TypeScript + Bun
- Zod (Schema validation)
- WebSocket for real-time communication

**MCP Server:**
- @modelcontextprotocol/sdk: ^1.13.0
- Express: ^5.1.0
- express-ws: ^5.0.2 (Express統合WebSocketサーバー)

**VRM Client:**
- HonoX: ^0.1.42 (Hono + JSX framework)
- Three.js: ^0.170.0
- @pixiv/three-vrm: ^3.1.0
- Tailwind CSS: ^4.0.9
- Vite: ^6.3.5
- Wrangler: ^4.4.0 (Cloudflare Workers)

### 開発環境
- Bunを実行環境として使用
- TypeScript strict mode有効
- プロジェクトは2つの独立したパッケージとして構成
- Cloudflare Workersデプロイメント対応

## 実装状況と接続方法

### MCPツール（実装済み）
MCPサーバーは以下のツールを提供:

**基本ツール:**
- `register-agent`: 新しいagentを登録（Session IDを自動生成）
- `get-capability`: キャラクターが使用可能なactionの定義を取得
- `get-perception`: 知覚情報の取得（categoryパラメータ必須）
- `play-action`: VRMキャラクターにアクションを実行（VCCPメッセージ形式）

**サポートされるアクション:**
- `movement`: キャラクター移動制御（target: {x, y, z}座標指定）
- `lookAt`: 視線制御（target.value: {x, y, z}座標指定）
- `expression`: 表情制御（preset: 文字列指定）

### VRM Client機能（実装済み）
- Three.js + VRMLoader による3Dキャラクター表示
- 室内環境の3D空間構築（部屋、家具配置）
- WebSocket経由でのVCCPメッセージ受信
- リアルタイムキャラクター制御（移動、視線、表情、アニメーション）

### 接続フロー
1. MCP Server起動（Port 3000でHTTP + WebSocket統合サーバー起動）
2. LLMがMCP経由で`register-agent`ツールを実行してSession IDを取得
3. VRM ClientがSession IDを使用してWebSocketエンドポイント（`ws://localhost:3000/vccp/:sessionId`）に接続
4. クライアントが`capability`メッセージをサーバーに送信
5. LLMが`play-action`ツールでVCCPメッセージを送信
6. MCP ServerがWebSocket経由で対象セッションのクライアントにメッセージを送信
7. VRMクライアントがリアルタイムでキャラクター制御を実行

### 重要な実装ポイント
- Express + express-wsによる統合アーキテクチャで1つのポートで両方のサービスを提供
- Session IDベースのクライアント管理（セッション毎に個別通信）
- WebSocketクライアントの接続/切断管理は自動化されている
- VCCPメッセージ型定義が2箇所に存在：`protocol/mcp/types.ts` と `protocol/client/app/types.ts`
- クライアントURLパラメータで`sessionId`を指定: `?sessionId=<session-id>`

### ファイル構造の理解
- **protocol/mcp/index.ts**: MCPサーバーのメインファイル（4つのMCPツール定義）
- **protocol/client/app/islands/vccp-client.tsx**: VRMクライアントのメインコンポーネント
- **protocol/client/app/routes/index.tsx**: ルートページ（VCCPClientを描画）
- **VRMファイル**: `protocol/client/public/AliciaSolid-1.0.vrm` を読み込み

## デバッグとトラブルシューティング

### よくある問題
- **WebSocket接続エラー**: Session IDが未登録またはURL形式が間違っている
- **メッセージ受信エラー**: VCCPMessageSchemaのZod検証が失敗している
- **アクション実行エラー**: VRMモデル読み込み前にアクションが送信されている

### デバッグ方法
- MCPサーバーのコンソールログでWebSocket接続状況を確認
- ブラウザのコンソールログでVCCPメッセージ受信状況を確認
- `get-capability`ツールでクライアントの能力情報を確認
