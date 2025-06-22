# VCCP (VRM Character Control Protocol) 仕様書 v1.0

## 1. 概要

VCCP (VRM Character Control Protocol) は、LLM (Large Language Model) が MCP (Model Context Protocol) を経由して VRM モデルを人間らしく操作するためのプロトコルです。WebSocket を基盤とし、双方向のリアルタイム通信により、知覚情報の受信と制御命令の送信を実現します。

### 1.1 設計原則

- **シンプルさ**: 最小限の仕様で最大限の表現力を実現
- **拡張性**: ユーザーが独自の知覚情報や制御命令を追加可能
- **リアルタイム性**: 低遅延での双方向通信
- **人間らしさ**: 自然な動作とインタラクションの実現

## 2. アーキテクチャ

```
┌─────────────┐     MCP      ┌──────────────────┐    WebSocket    ┌─────────────┐
│     LLM     │◄────────────►│  VCCP Server     │◄───────────────►│   Client    │
│             │              │                  │                 │   (VRM)     │
└─────────────┘              └──────────────────┘                 └─────────────┘
```

## 3. 通信プロトコル

### 3.1 接続確立

- WebSocket 接続: `ws://[server]:[port]/vccp`
- プロトコルバージョン: `vccp-1.0`

### 3.2 メッセージフォーマット

すべてのメッセージは JSON 形式で、以下の基本構造を持ちます：

```json
{
  "type": "perception|action|system",
  "category": "string",
  "timestamp": "ISO 8601",
  "data": {}
}
```

## 4. 知覚情報 (Perception)

### 4.1 基本知覚情報

#### 視覚情報

```json
{
  "type": "perception",
  "category": "vision",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "image": "base64_encoded_image",
    "format": "jpeg|png",
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "fov": 60
  }
}
```

#### 環境情報

```json
{
  "type": "perception",
  "category": "environment",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "objects": [
      {
        "id": "obj_001",
        "type": "furniture|person|object",
        "name": "chair",
        "position": {
          "x": 1.5,
          "y": 0.0,
          "z": 2.0
        }
      }
    ]
  }
}
```

#### ユーザー状態

```json
{
  "type": "perception",
  "category": "user",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "position": {
      "x": 0.0,
      "y": 1.6,
      "z": 0.0
    },
    "activity": "string"
  }
}
```

### 4.2 カスタム知覚情報

ユーザーは独自の知覚情報を定義できます：

```json
{
  "type": "perception",
  "category": "[name]",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    // ユーザー定義のデータ構造
  }
}
```

## 5. 制御命令 (Action)

### 5.1 基本制御命令

#### 移動

```json
{
  "type": "action",
  "category": "movement",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "target": {
      "x": 2.0,
      "y": 0.0,
      "z": 3.0
    },
    "speed": 1.0
  }
}
```

#### 視線制御

```json
{
  "type": "action",
  "category": "lookAt",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "target": {
      "type": "position|object",
      "value": {
        "x": 1.0,
        "y": 1.6,
        "z": 2.0
      }
    }
  }
}
```

#### 表情制御

```json
{
  "type": "action",
  "category": "expression",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "preset": "a|e|i|o|u|blink|joy|angry|sorrow|fun|lookup|lookdown|lookleft|lookright|blink_l|blink_r|neutral"
  }
}
```

#### ジェスチャー

```json
{
  "type": "action",
  "category": "anim",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "bvh": "base64_encoded_bvh"
  }
}
```

### 5.2 カスタム制御命令

```json
{
  "type": "action",
  "category": "[name]",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    // ユーザー定義の制御データ
  }
}
```
