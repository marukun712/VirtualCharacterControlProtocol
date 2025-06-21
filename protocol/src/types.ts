// JSON-RPC 2.0 基本型定義
export interface JSONRPCRequest {
  jsonrpc: '2.0'
  method: string
  params?: any
  id: string | number | null
}

export interface JSONRPCResponse {
  jsonrpc: '2.0'
  result?: any
  error?: JSONRPCError
  id: string | number | null
}

export interface JSONRPCError {
  code: number
  message: string
  data?: any
}

// VCCP コアメソッド型定義
export interface VCCPExecuteParams {
  action: string
  data: Record<string, any>
  context: Record<string, any>
}

export interface VCCPContextSetParams {
  context: Record<string, any>
}

export interface VCCPPluginRegisterParams {
  name: string
  handlers: Record<string, string>
}

// 標準アクションタイプ
export interface MotionAction {
  action: 'motion'
  data: {
    type: 'name' | 'description' | 'generated'
    value: string
  }
  context: Record<string, any>
}

export interface ExpressionAction {
  action: 'expression'
  data: {
    type: 'preset' | 'blendshapes' | 'generated'
    value: string
  }
  context: Record<string, any>
}

export interface SpeechAction {
  action: 'speech'
  data: {
    text: string
    options?: {
      emotion?: string
      speed?: number
    }
  }
  context: Record<string, any>
}

// イベント型定義
export interface VCCPEvent {
  type: 'action.completed' | 'context.changed' | 'plugin.response'
  data: Record<string, any>
}

// プラグインインターフェース
export interface PluginHandler {
  handle(action: string, data: any, context: any): Promise<any>
}

export interface RegisteredPlugin {
  name: string
  handlers: Record<string, PluginHandler>
}