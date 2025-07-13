import type {
  Action,
  ActionGetRequest,
  ActionGetResponse,
  ActionListRequest,
  ActionListResponse,
  ActionPlayRequest,
  ActionPlayResponse,
  PerceptionCategoryRequest,
  PerceptionCategoryResponse,
  PerceptionListRequest,
  PerceptionListResponse,
  PerceptionSetRequest,
  RegisterRequest,
  RegisterResponse,
  SchedulerAction,
  SchedulerSendRequest,
  SchedulerSendResponse,
  ExecuteParams,
} from "./types";
import { ExecuteRequestSchema, JSONRPCResponseSchema } from "./types";

interface PendingRequest {
  resolve: Function;
  reject: Function;
  timeoutId: NodeJS.Timeout;
}

export class VCCPClient {
  private config: { url: string };
  private ws: WebSocket | null = null;
  private id: number = 1;
  private pending = new Map<number | string, PendingRequest>();
  private callback: {
    onOpen: () => void;
    onMessage: (data: Record<string, any>) => void;
    onError: (error: string) => void;
    onExecute: (params: ExecuteParams) => void;
  };
  private readonly TIMEOUT_MS = 5000;

  constructor(
    config: { url: string },
    callback: {
      onOpen: () => void;
      onMessage: (data: Record<string, any>) => void;
      onError: (error: string) => void;
      onExecute: (params: ExecuteParams) => void;
    }
  ) {
    this.config = config;
    this.callback = callback;
  }

  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        resolve("VCCPサーバーとの接続が確立されました");
        this.callback.onOpen();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());

          // executeメソッドのメッセージかチェック
          const executeResult = ExecuteRequestSchema.safeParse(data);
          if (executeResult.success) {
            this.callback.onExecute(executeResult.data.params);
            this.callback.onMessage(executeResult.data);
            return;
          }

          const responseResult = JSONRPCResponseSchema.safeParse(data);

          if (responseResult.success) {
            const pending = this.pending.get(responseResult.data.id);
            //リクエストがレスポンス待ちのリクエストであれば
            if (pending) {
              // タイムアウトをクリア
              clearTimeout(pending.timeoutId);
              this.pending.delete(responseResult.data.id);

              if (responseResult.data.error) {
                pending.reject(responseResult.data);
                this.callback.onError(responseResult.data.error.message);
              } else {
                pending.resolve(responseResult.data);
              }
            }
          }

          this.callback.onMessage(data);
        } catch (e) {
          console.error(e);
          this.callback.onError(e instanceof Error ? e.message : String(e));
        }
      };

      this.ws.onerror = (error) => {
        reject(error);
        this.callback.onError(
          error instanceof Event ? "WebSocket connection error" : String(error)
        );
      };
    });
  }

  private sendRequest<T>(request: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject("VCCPサーバーとの接続が確立されていません。");
      }

      const requestId = this.id;

      // タイムアウトを設定
      const timeoutId = setTimeout(() => {
        const pending = this.pending.get(requestId);
        if (pending) {
          this.pending.delete(requestId);
          reject(
            new Error(`リクエストがタイムアウトしました (${this.TIMEOUT_MS}ms)`)
          );
        }
      }, this.TIMEOUT_MS);

      this.ws.send(JSON.stringify(request));
      this.pending.set(requestId, { resolve, reject, timeoutId });

      this.id++;
    });
  }

  register(actions: Action[]): Promise<RegisterResponse> {
    const req: RegisterRequest = {
      jsonrpc: "2.0",
      id: this.id,
      method: "register",
      params: { actions },
    };

    return this.sendRequest<RegisterResponse>(req);
  }

  listActions(sessionId: string): Promise<ActionListResponse> {
    const req: ActionListRequest = {
      jsonrpc: "2.0",
      id: this.id,
      method: "action.list",
      params: { sessionId },
    };

    return this.sendRequest<ActionListResponse>(req);
  }

  getAction(sessionId: string, name: string): Promise<ActionGetResponse> {
    const req: ActionGetRequest = {
      jsonrpc: "2.0",
      id: this.id,
      method: "action.get",
      params: { sessionId, action: name },
    };

    return this.sendRequest<ActionGetResponse>(req);
  }

  playAction(
    sessionId: string,
    name: string,
    params: Record<string, any>
  ): Promise<ActionPlayResponse> {
    const req: ActionPlayRequest = {
      jsonrpc: "2.0",
      id: this.id,
      method: "action.play",
      params: { sessionId, action: name, properties: params },
    };

    return this.sendRequest<ActionPlayResponse>(req);
  }

  setPerception(sessionId: string, category: string, perception: string): void {
    if (!this.ws) {
      throw new Error("VCCPサーバーとの接続が確立されていません。");
    }

    const req: PerceptionSetRequest = {
      jsonrpc: "2.0",
      method: "perception.set",
      params: { sessionId, perception, category },
    };

    this.ws.send(JSON.stringify(req));
  }

  getPerceptionByCategory(
    sessionId: string,
    category: string
  ): Promise<PerceptionCategoryResponse> {
    const req: PerceptionCategoryRequest = {
      jsonrpc: "2.0",
      id: this.id,
      method: "perception.category",
      params: { sessionId, category },
    };

    return this.sendRequest<PerceptionCategoryResponse>(req);
  }

  listPerception(sessionId: string): Promise<PerceptionListResponse> {
    const req: PerceptionListRequest = {
      jsonrpc: "2.0",
      id: this.id,
      method: "perception.list",
      params: { sessionId },
    };

    return this.sendRequest<PerceptionListResponse>(req);
  }

  sendScheduler(
    sessionId: string,
    duration: number,
    actions: SchedulerAction[]
  ): Promise<SchedulerSendResponse> {
    const req: SchedulerSendRequest = {
      jsonrpc: "2.0",
      id: this.id,
      method: "scheduler.send",
      params: { sessionId, duration, actions },
    };

    return this.sendRequest<SchedulerSendResponse>(req);
  }
}

export * from "./types";
