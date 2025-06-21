import { VCCPCore } from './core'
import { 
  AIMotionGeneratorPlugin, 
  EmotionAnalyzerPlugin, 
  GestureGeneratorPlugin 
} from './plugins/sample-plugin'

export class PluginManager {
  private core: VCCPCore

  constructor(core: VCCPCore) {
    this.core = core
  }

  // 標準プラグインの初期化
  async initializeDefaultPlugins(): Promise<void> {
    // AI Motion Generator Plugin
    const aiMotionPlugin = new AIMotionGeneratorPlugin()
    await this.core.registerPlugin({
      name: 'ai_motion',
      handlers: {
        'generate': 'builtin' // 内蔵プラグインマーカー
      }
    })
    this.registerBuiltinHandler('ai_motion.generate', aiMotionPlugin)

    // Emotion Analyzer Plugin  
    const emotionPlugin = new EmotionAnalyzerPlugin()
    await this.core.registerPlugin({
      name: 'emotion',
      handlers: {
        'analyze': 'builtin'
      }
    })
    this.registerBuiltinHandler('emotion.analyze', emotionPlugin)

    // Gesture Generator Plugin
    const gesturePlugin = new GestureGeneratorPlugin()
    await this.core.registerPlugin({
      name: 'gesture',
      handlers: {
        'generate': 'builtin'
      }
    })
    this.registerBuiltinHandler('gesture.generate', gesturePlugin)

    console.log('Default plugins initialized')
  }

  // 内蔵プラグインハンドラーの登録
  private registerBuiltinHandler(action: string, plugin: any): void {
    // VCCPCoreの内部プラグインマップに直接アクセス
    // 実際の実装では、よりクリーンなAPIを提供すべき
    const [pluginName, methodName] = action.split('.')
    const registeredPlugin = (this.core as any).plugins.get(pluginName)
    
    if (registeredPlugin) {
      registeredPlugin.handlers[methodName] = {
        handle: async (action: string, data: any, context: any) => {
          return await plugin.handle(action, data, context)
        }
      }
    }
  }

  // 複合アクションの実行サポート
  async executeComposite(actions: Array<{action: string, data: any, context?: any}>): Promise<any[]> {
    const results = []
    
    for (const actionSpec of actions) {
      try {
        const result = await this.core.execute({
          action: actionSpec.action,
          data: actionSpec.data,
          context: actionSpec.context || {}
        })
        results.push(result)
      } catch (error) {
        results.push({ 
          error: true, 
          message: error instanceof Error ? error.message : 'Unknown error',
          action: actionSpec.action 
        })
      }
    }
    
    return results
  }

  // プラグインの動的ロード（将来の拡張用）
  async loadExternalPlugin(pluginUrl: string, config: any): Promise<void> {
    // 将来の実装：外部プラグインのロード
    console.log(`Loading external plugin from: ${pluginUrl}`, config)
    throw new Error('External plugin loading not implemented yet')
  }
}