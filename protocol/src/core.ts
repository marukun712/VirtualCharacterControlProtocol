import { 
  JSONRPCRequest, 
  JSONRPCResponse, 
  JSONRPCError,
  VCCPExecuteParams, 
  VCCPContextSetParams, 
  VCCPPluginRegisterParams,
  VCCPEvent,
  RegisteredPlugin,
  PluginHandler
} from './types'

export class VCCPCore {
  private context: Record<string, any> = {}
  private plugins: Map<string, RegisteredPlugin> = new Map()
  private eventHandlers: Array<(event: VCCPEvent) => void> = []

  // JSON-RPC リクエスト処理
  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    try {
      let result: any

      switch (request.method) {
        case 'core.execute':
          result = await this.execute(request.params as VCCPExecuteParams)
          break
        case 'context.set':
          result = await this.setContext(request.params as VCCPContextSetParams)
          break
        case 'plugin.register':
          result = await this.registerPlugin(request.params as VCCPPluginRegisterParams)
          break
        default:
          throw this.createError(-32601, 'Method not found')
      }

      return {
        jsonrpc: '2.0',
        result,
        id: request.id
      }
    } catch (error) {
      const rpcError = error as JSONRPCError
      return {
        jsonrpc: '2.0',
        error: rpcError,
        id: request.id
      }
    }
  }

  // コア実行メソッド
  async execute(params: VCCPExecuteParams): Promise<any> {
    const { action, data, context } = params

    // プラグインアクションかチェック
    if (action.includes('.')) {
      return await this.executePluginAction(action, data, context)
    }

    // 標準アクションの実行
    switch (action) {
      case 'motion':
        return await this.executeMotion(data, context)
      case 'expression':
        return await this.executeExpression(data, context)
      case 'speech':
        return await this.executeSpeech(data, context)
      default:
        throw this.createError(-32602, `Unknown action: ${action}`)
    }
  }

  // コンテキスト設定
  async setContext(params: VCCPContextSetParams): Promise<{ success: boolean }> {
    this.context = { ...this.context, ...params.context }
    
    // コンテキスト変更イベントを発火
    this.emitEvent({
      type: 'context.changed',
      data: { context: this.context }
    })

    return { success: true }
  }

  // プラグイン登録
  async registerPlugin(params: VCCPPluginRegisterParams): Promise<{ success: boolean }> {
    const { name, handlers } = params
    
    // プラグインハンドラーをモック実装
    const pluginHandlers: Record<string, PluginHandler> = {}
    for (const [handlerName, endpoint] of Object.entries(handlers)) {
      pluginHandlers[handlerName] = {
        handle: async (action: string, data: any, context: any) => {
          // 実際の実装では外部エンドポイントを呼び出し
          console.log(`Plugin ${name}.${handlerName} called with:`, { action, data, context })
          return { success: true, plugin: name, handler: handlerName }
        }
      }
    }

    this.plugins.set(name, { name, handlers: pluginHandlers })
    return { success: true }
  }

  // プラグインアクション実行
  private async executePluginAction(action: string, data: any, context: any): Promise<any> {
    const [pluginName, methodName] = action.split('.')
    const plugin = this.plugins.get(pluginName)

    if (!plugin) {
      throw this.createError(-32602, `Plugin not found: ${pluginName}`)
    }

    const handler = plugin.handlers[methodName]
    if (!handler) {
      throw this.createError(-32602, `Handler not found: ${pluginName}.${methodName}`)
    }

    const result = await handler.handle(action, data, { ...this.context, ...context })
    
    this.emitEvent({
      type: 'plugin.response',
      data: { plugin: pluginName, method: methodName, result }
    })

    return result
  }

  // 標準アクション実行メソッド群
  private async executeMotion(data: any, context: any): Promise<any> {
    console.log('Motion executed:', { data, context: { ...this.context, ...context } })
    
    this.emitEvent({
      type: 'action.completed',
      data: { action: 'motion', data, context }
    })

    return { 
      success: true, 
      action: 'motion',
      executed_at: new Date().toISOString()
    }
  }

  private async executeExpression(data: any, context: any): Promise<any> {
    console.log('Expression executed:', { data, context: { ...this.context, ...context } })
    
    this.emitEvent({
      type: 'action.completed',
      data: { action: 'expression', data, context }
    })

    return { 
      success: true, 
      action: 'expression',
      executed_at: new Date().toISOString()
    }
  }

  private async executeSpeech(data: any, context: any): Promise<any> {
    console.log('Speech executed:', { data, context: { ...this.context, ...context } })
    
    this.emitEvent({
      type: 'action.completed',
      data: { action: 'speech', data, context }
    })

    return { 
      success: true, 
      action: 'speech',
      executed_at: new Date().toISOString()
    }
  }

  // イベント処理
  private emitEvent(event: VCCPEvent): void {
    this.eventHandlers.forEach(handler => handler(event))
  }

  onEvent(handler: (event: VCCPEvent) => void): void {
    this.eventHandlers.push(handler)
  }

  // エラーヘルパー
  private createError(code: number, message: string, data?: any): JSONRPCError {
    return { code, message, data }
  }

  // 現在の状態取得（デバッグ用）
  getStatus() {
    return {
      context: this.context,
      plugins: Array.from(this.plugins.keys()),
      eventHandlers: this.eventHandlers.length
    }
  }
}