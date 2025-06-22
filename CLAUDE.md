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
bun run dev     # Vite開発サーバー起動
bun run build   # 本番ビルド（クライアント＋サーバー両方）
bun run preview # Wrangler経由でプレビュー
bun run deploy  # Cloudflare Workersにデプロイ
```

## アーキテクチャ概要

このプロジェクトは VCCP (VRM Character Control Protocol) の実装で、以下の2つの主要コンポーネントから構成されている：

### 1. MCP Server (`protocol/mcp/`)
- Model Context Protocol (MCP) SDK を使用したLLM連携サーバー
- **統合アーキテクチャ**: 1つのExpressアプリケーションでHTTPとWebSocketを統合提供
  - Port 3000: HTTP MCP サーバー（LLMとの通信）+ WebSocket サーバー（VRMクライアントとの通信）
- VCCP v1.0に準拠した8つのツールを提供（完全実装済み）
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

### MCPツール（完全実装済み）
MCPサーバーは以下のVCCP v1.0準拠ツールを提供:

**キャラクター制御ツール:**
- `get-perception`: 知覚情報の取得
- `move-character`: キャラクター移動制御（x,y,z座標指定）
- `look-at`: 視線制御（x,y,z座標またはターゲット指定）
- `set-expression`: 表情制御（17種類のプリセット対応）
- `play-animation`: BVHアニメーション再生（URL指定）

**クライアント通信ツール:**
- `send-system-message`: システムメッセージをクライアントに送信
- `send-perception-update`: 知覚情報更新をクライアントに送信
- `send-custom-event`: カスタムイベントメッセージを送信
- `get-connected-clients`: 接続中のクライアント数を取得

### VRM Client機能（実装済み）
- Three.js + VRMLoader による3Dキャラクター表示
- 室内環境の3D空間構築（部屋、家具配置）
- WebSocket経由でのVCCPメッセージ受信
- リアルタイムキャラクター制御（移動、視線、表情、アニメーション）

### 接続フロー
1. MCP Server起動（Port 3000でHTTP + WebSocket統合サーバー起動）
2. VRM ClientがWebSocketエンドポイント（`ws://localhost:3000/vccp`）に接続
3. LLMがMCP経由でVCCPメッセージを送信
4. MCP ServerがWebSocket経由で接続されたVRMクライアントにメッセージをブロードキャスト
5. VRMクライアントがリアルタイムでキャラクター制御を実行

### 重要な実装ポイント
- Express + express-wsによる統合アーキテクチャで1つのポートで両方のサービスを提供
- WebSocketクライアントの接続/切断管理は自動化されている
- 全ての制御命令は接続中の全クライアントにブロードキャストされる
- `protocol/mcp/types.ts` にVCCPメッセージの型定義が含まれている
