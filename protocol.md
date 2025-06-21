# VRM Character Control Protocol (VCCP) v1.0

## 概要

VRM Character Control Protocol (VCCP) は、LLM が VRM キャラクターの行動を制御するための最小限かつ拡張可能な通信プロトコルです。

## コア設計思想

- **最小限のコア API**: 基本的な制御のみをコアに含める
- **プラグイン駆動**: すべての高度な機能はプラグインとして実装
- **コンテキスト中心**: すべての動作はコンテキストに基づいて決定

## アーキテクチャ

```
┌─────────────┐              ┌──────────────┐
│     LLM     │◄────VCCP────►│     Core     │
└─────────────┘              └──────────────┘
                                    │
                             ┌──────┴──────┐
                             ▼             ▼
                      ┌──────────┐  ┌──────────┐
                      │ Plugins  │  │   VRM    │
                      └──────────┘  └──────────┘
```

## 基本仕様

### 通信方式

- **プロトコル**: JSON-RPC 2.0 over WebSocket
- **メッセージフォーマット**: JSON

### 基本メッセージ構造

```json
{
  "jsonrpc": "2.0",
  "method": "core.execute",
  "params": {
    "action": "string",
    "data": {},
    "context": {}
  },
  "id": "string"
}
```

## コア API（最小限）

### 1. 基本実行

#### core.execute

すべての動作の基本となるメソッド。プラグインがこれを拡張する。

```json
{
  "method": "core.execute",
  "params": {
    "action": "motion|expression|speech|custom",
    "data": {
      // アクション固有のデータ
    },
    "context": {
      // 実行コンテキスト
    }
  }
}
```

### 2. コンテキスト管理

#### context.set

グローバルコンテキストの設定

```json
{
  "method": "context.set",
  "params": {
    "context": {
      // 任意の構造のコンテキストデータ
      "environment": {},
      "conversation": {},
      "emotional_state": {},
      "custom": {}
    }
  }
}
```

### 3. プラグイン管理

#### plugin.register

プラグインの登録

```json
{
  "method": "plugin.register",
  "params": {
    "name": "string",
    "handlers": {
      "motion": "endpoint_url",
      "expression": "endpoint_url",
      "custom_action": "endpoint_url"
    }
  }
}
```

## 標準アクションタイプ

### Motion

```json
{
  "action": "motion",
  "data": {
    "type": "name|description|generated",
    "value": "wave|手を振る動作|{motion_data}"
  },
  "context": {
    "emotion": "happy",
    "intensity": 0.8
  }
}
```

### Expression

```json
{
  "action": "expression",
  "data": {
    "type": "preset|blendshapes|generated",
    "value": "joy|{blendshape_values}|{expression_data}"
  },
  "context": {
    "conversation_tone": "friendly"
  }
}
```

### Speech

```json
{
  "action": "speech",
  "data": {
    "text": "こんにちは！",
    "options": {
      "emotion": "happy",
      "speed": 1.0
    }
  },
  "context": {
    "dialogue_state": "greeting"
  }
}
```

## プラグインインターフェース

### プラグインメッセージフォーマット

```json
{
  "action": "plugin_name.method",
  "data": {
    // プラグイン固有のデータ
  },
  "context": {
    // 実行コンテキスト
  }
}
```

### 例: AI Motion Generator Plugin

```json
{
  "action": "ai_motion.generate",
  "data": {
    "prompt": "驚いて後ずさりする",
    "style": "realistic"
  },
  "context": {
    "current_pose": "standing",
    "emotional_state": "surprised"
  }
}
```

### 例: Emotion Analyzer Plugin

```json
{
  "action": "emotion.analyze",
  "data": {
    "text": "今日は本当に楽しかった！",
    "voice_data": "base64_audio"
  },
  "context": {
    "conversation_history": []
  }
}
```

## イベントシステム

### イベント通知

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "type": "action.completed|context.changed|plugin.response",
    "data": {
      // イベント固有のデータ
    }
  }
}
```

## 拡張例

### 1. 複雑なインタラクション

```python
# LLM側の実装例
async def respond_to_user(vccp_client, user_input):
    # 感情分析プラグインを使用
    emotion_result = await vccp_client.execute({
        "action": "emotion.analyze",
        "data": {"text": user_input},
        "context": {"conversation_history": history}
    })

    # コンテキストを更新
    await vccp_client.execute({
        "method": "context.set",
        "params": {
            "context": {
                "user_emotion": emotion_result["emotion"],
                "topic": emotion_result["topic"]
            }
        }
    })

    # AIでモーションを生成
    motion = await vccp_client.execute({
        "action": "ai_motion.generate",
        "data": {
            "prompt": f"{emotion_result['emotion']}な反応をする"
        },
        "context": current_context
    })

    # 統合アクションを実行
    await vccp_client.execute({
        "action": "composite",
        "data": {
            "motion": motion,
            "expression": emotion_result["suggested_expression"],
            "speech": {
                "text": generate_response(user_input),
                "emotion": emotion_result["emotion"]
            }
        },
        "context": current_context
    })
```

### 2. カスタムプラグインの作成

```javascript
// プラグイン側の実装例
class GestureGeneratorPlugin {
  async handle(action, data, context) {
    if (action === "gesture.generate") {
      // コンテキストから会話の意図を理解
      const intent = this.analyzeIntent(context);

      // 適切なジェスチャーを生成
      const gesture = await this.generateGesture(
        data.description,
        intent,
        context.cultural_background
      );

      // 標準フォーマットで返す
      return {
        action: "motion",
        data: {
          type: "generated",
          value: gesture,
        },
        context: {
          gesture_type: intent.type,
          confidence: 0.95,
        },
      };
    }
  }
}
```

## 設計の利点

1. **極めてシンプルなコア**: 3 つのメソッドのみ
2. **無限の拡張性**: プラグインで任意の機能を追加
3. **コンテキスト駆動**: すべての動作が文脈を考慮
4. **AI フレンドリー**: LLM が理解しやすい構造
5. **実装の自由度**: VRM 実装側が独自に解釈可能

## 実装ガイドライン

### コア実装（必須）

- `core.execute`: アクションの実行
- `context.set`: コンテキストの管理
- `plugin.register`: プラグインの登録

### 推奨プラグイン

- Motion Generator: AI 駆動のモーション生成
- Emotion Analyzer: 感情分析
- Gesture Library: ジェスチャーライブラリ
- Voice Synthesizer: 音声合成
- Behavior Composer: 複合動作の生成

この設計により、実装者は最小限のコア API から始めて、必要に応じてプラグインを追加することで、段階的に機能を拡張できます。
