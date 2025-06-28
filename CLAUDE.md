# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

必ず日本語で回答してください。

## 開発コマンド

### MCPサーバー実装例
```bash
cd example/mcp
bun install
bun run index.ts  # Port 3000で HTTP (MCP) + WebSocket 統合サーバー起動
```

### VRMクライアント実装例（HonoX + Three.js）
```bash
cd example/client
bun install
bun run dev     # Vite開発サーバー起動（http://localhost:5173）
bun run build   # 本番ビルド（クライアント＋サーバー両方）
bun run preview # Wrangler経由でプレビュー
bun run deploy  # Cloudflare Workersにデプロイ
```

### ワークスペース全体
```bash
# ルートディレクトリで全パッケージのインストール
bun install
```

### 開発時の起動順序
1. MCPサーバー実装例を先に起動（Port 3000）
2. VRMクライアント実装例の開発サーバーを起動（Port 5173）
3. ブラウザで `http://localhost:5173?sessionId=<session-id>` にアクセス

### テストとビルド
現在、専用のテストフレームワークは設定されていません。テストが必要な場合は、Bunの標準テスト機能または個別のテストセットアップが必要です。

TypeScriptの型チェック:
```bash
# MCPサーバー実装例
cd example/mcp
bun run tsc --noEmit

# VRMクライアント実装例
cd example/client
bun run tsc --noEmit

# ライブラリパッケージ
cd packages/vccp-server
bun run tsc --noEmit

cd packages/vccp-client
bun run tsc --noEmit
```

## アーキテクチャ概要

このプロジェクトは VCCP (VRM Character Control Protocol) のライブラリ実装で、Bunワークスペースで構成されている：

### ライブラリパッケージ (`packages/`)

#### 1. VCCP Server (`packages/vccp-server/`)
- Model Context Protocol (MCP) SDK を使用したLLM連携サーバーライブラリ
- **統合アーキテクチャ**: VCCPServerクラスでHTTPとWebSocketを1つのポートで統合提供
- VCCP v1.0に準拠した4つのMCPツールを提供
- Session IDベースのWebSocketクライアント管理機能

#### 2. VCCP Client (`packages/vccp-client/`)
- WebSocketクライアントライブラリ
- VCCPメッセージの型定義とバリデーション機能
- TypeScript/Zod対応

### 実装例 (`example/`)

#### 1. MCP Server例 (`example/mcp/`)
- VCCPServerライブラリを使用したMCPサーバー実装
- Port 3000でHTTP（MCP）+ WebSocket統合サーバー起動

#### 2. VRM Client例 (`example/client/`)
- HonoX + Three.js + @pixiv/three-vrm による3Dキャラクター表示
- WebSocket経由でVCCPメッセージを受信しリアルタイムキャラクター制御
- Cloudflare Workersへのデプロイメント対応
- 室内環境の3D空間とインタラクション機能

### プロトコル仕様
- WebSocketベースの双方向リアルタイム通信
- 知覚情報（perception）と制御命令（action）の定義
- カスタム拡張可能な設計
- VCCPMessageSchemaによるZodベースの型検証

### 技術スタック
**共通:**
- TypeScript + Bun
- Zod (Schema validation)
- WebSocket for real-time communication

**VCCPサーバーライブラリ (`packages/vccp-server/`):**
- @modelcontextprotocol/sdk: ^1.13.0
- Express: ^5.1.0
- express-ws: ^5.0.2
- zod: ^3.25.67

**VCCPクライアントライブラリ (`packages/vccp-client/`):**
- zod: ^3.25.67

**VRMクライアント実装例 (`example/client/`):**
- HonoX: ^0.1.42 (Hono + JSX framework)
- Three.js: ^0.170.0
- @pixiv/three-vrm: ^3.1.0
- Tailwind CSS: ^4.0.9
- Vite: ^6.3.5
- Wrangler: ^4.4.0 (Cloudflare Workers)

### 開発環境
- Bunワークスペース構成
- TypeScript strict mode有効
- ライブラリパッケージ + 実装例の構成
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
- VCCPServerクラスでExpress + express-wsによる統合アーキテクチャ（1ポートで両サービス提供）
- Session IDベースのクライアント管理（セッション毎に個別通信）
- WebSocketクライアントの接続/切断管理は自動化されている
- ライブラリとして分離されており、独自実装での利用が可能
- クライアントURLパラメータで`sessionId`を指定: `?sessionId=<session-id>`

### ファイル構造の理解

**ライブラリパッケージ:**
- **packages/vccp-server/index.ts**: VCCPServerクラス（MCPツール + WebSocket統合）
- **packages/vccp-server/types.ts**: サーバー側型定義（SessionManager, Agent等）
- **packages/vccp-client/index.ts**: WebSocketクライアントライブラリ
- **packages/vccp-client/types.ts**: クライアント側型定義

**実装例:**
- **example/mcp/index.ts**: MCPサーバー実装例（VCCPServerライブラリ使用）
- **example/client/app/islands/vccp-client.tsx**: VRMクライアントのメインコンポーネント
- **example/client/app/routes/index.tsx**: ルートページ（VCCPClientを描画）
- **VRMファイル**: `example/client/public/AliciaSolid-1.0.vrm` を読み込み

### 設定ファイル
- **package.json**: Bunワークスペース設定（ルート）
- **example/client/vite.config.ts**: Vite設定（HonoX + Cloudflare Workers対応）
- **各パッケージ/tsconfig.json**: TypeScript strict設定

### 重要な注意点
- **型定義の重複**: VCCPMessageSchemaが3箇所に定義されている
  - `packages/vccp-server/types.ts`
  - `packages/vccp-client/types.ts`
  - `example/client/app/types.ts`

## デバッグとトラブルシューティング

### よくある問題
- **WebSocket接続エラー**: Session IDが未登録またはURL形式が間違っている
- **メッセージ受信エラー**: VCCPMessageSchemaのZod検証が失敗している
- **アクション実行エラー**: VRMモデル読み込み前にアクションが送信されている

### デバッグ方法
- MCPサーバーのコンソールログでWebSocket接続状況を確認
- ブラウザのコンソールログでVCCPメッセージ受信状況を確認
- `get-capability`ツールでクライアントの能力情報を確認
