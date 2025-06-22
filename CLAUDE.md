# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

必ず日本語で回答してください。

## 開発コマンド

### MCP Server（MCPプロトコル実装）
```bash
cd protocol/mcp
bun install
bun run index.ts
```

### WebSocket Server（Honoベース）
```bash
cd protocol/server
bun install
bun run dev  # 開発サーバー起動（ホットリロード有効）
```
開発サーバーは http://localhost:3000 でアクセス可能

## アーキテクチャ概要

このプロジェクトは VCCP (VRM Character Control Protocol) の実装で、以下の2つの主要コンポーネントから構成されている：

### 1. MCP Server (`protocol/mcp/`)
- Model Context Protocol (MCP) SDK を使用したLLM連携サーバー
- WebSocket通信でVRMクライアントと接続
- 現在は仮実装（weather APIのサンプルコード）
- 将来的にはVCCPプロトコルに準拠したツールを提供

### 2. WebSocket Server (`protocol/server/`)
- Hono フレームワークベースのWebSocketサーバー
- VRMクライアントとの直接通信を担当
- 現在は基本的なHTTPサーバーとして実装

### プロトコル仕様
- `protocol.md` にVCCP v1.0の詳細仕様を記載
- WebSocketベースの双方向リアルタイム通信
- 知覚情報（perception）と制御命令（action）の定義
- カスタム拡張可能な設計

### 技術スタック
- TypeScript + Bun
- MCP SDK (@modelcontextprotocol/sdk)
- Hono (Web framework)
- Zod (Schema validation)
- WebSocket for real-time communication

### 開発環境
- Bunを実行環境として使用
- TypeScript strict mode有効
- プロジェクトは2つの独立したパッケージとして構成

## 実装状況と接続方法

### MCPツール
MCPサーバーは以下のツールを提供:
- `get-perception`: 知覚情報の取得
- `move-character`: キャラクター移動制御
- `look-at`: 視線制御
- `set-expression`: 表情制御
- `play-animation`: BVHアニメーション再生

### 接続フロー
1. MCPサーバーがWebSocketサーバー(`ws://localhost:3000/vccp`)に接続
2. VRMクライアントもWebSocketエンドポイントに接続
3. MCPツール経由でLLMから制御命令を送信
