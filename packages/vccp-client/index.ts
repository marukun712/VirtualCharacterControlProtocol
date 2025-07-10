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
} from "./types";

export class VCCPClient {
  private config: { url: string };
  private ws: WebSocket | null = null;
  private id: number = 1;
  private pending = new Map<number, { resolve: Function; reject: Function }>();
  private callback: {
    onOpen: Function;
    onMessage: Function;
    onError: Function;
  };

  constructor(
    config: { url: string },
    callback: {
      onOpen: Function;
      onMessage: Function;
      onError: Function;
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
          const pending = this.pending.get(data.id);

          //リクエストがレスポンス待ちのリクエストであれば
          if (pending) {
            if (data.error) {
              pending.reject(data);
            } else {
              pending.resolve(data);
            }
          }

          this.callback.onMessage(data);
        } catch (e) {
          console.error(e);
          this.callback.onError(e);
        }
      };

      this.ws.onerror = (error) => {
        reject(error);
        this.callback.onError(error);
      };
    });
  }

  register(actions: Action[]): Promise<RegisterResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject("VCCPサーバーとの接続が確立されていません。");
      }

      const req: RegisterRequest = {
        jsonrpc: "2.0",
        id: this.id,
        method: "register",
        params: { actions },
      };

      this.ws.send(JSON.stringify(req));
      this.pending.set(this.id, { resolve, reject });

      this.id++;
    });
  }

  listActions(sessionId: string): Promise<ActionListResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject("VCCPサーバーとの接続が確立されていません。");
      }

      const req: ActionListRequest = {
        jsonrpc: "2.0",
        id: this.id,
        method: "action.list",
        params: { sessionId },
      };

      this.ws.send(JSON.stringify(req));
      this.pending.set(this.id, { resolve, reject });

      this.id++;
    });
  }

  getAction(sessionId: string, name: string): Promise<ActionGetResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject("VCCPサーバーとの接続が確立されていません。");
      }

      const req: ActionGetRequest = {
        jsonrpc: "2.0",
        id: this.id,
        method: "action.get",
        params: { sessionId, action: name },
      };

      this.ws.send(JSON.stringify(req));
      this.pending.set(this.id, { resolve, reject });

      this.id++;
    });
  }

  playAction(
    sessionId: string,
    name: string,
    params: Record<string, any>
  ): Promise<ActionPlayResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject("VCCPサーバーとの接続が確立されていません。");
      }

      const req: ActionPlayRequest = {
        jsonrpc: "2.0",
        id: this.id,
        method: "action.play",
        params: { sessionId, action: name, properties: params },
      };

      this.ws.send(JSON.stringify(req));
      this.pending.set(this.id, { resolve, reject });

      this.id++;
    });
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
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject("VCCPサーバーとの接続が確立されていません。");
      }

      const req: PerceptionCategoryRequest = {
        jsonrpc: "2.0",
        id: this.id,
        method: "perception.category",
        params: { sessionId, category },
      };

      this.ws.send(JSON.stringify(req));
      this.pending.set(this.id, { resolve, reject });

      this.id++;
    });
  }

  listPerception(sessionId: string): Promise<PerceptionListResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject("VCCPサーバーとの接続が確立されていません。");
      }

      const req: PerceptionListRequest = {
        jsonrpc: "2.0",
        id: this.id,
        method: "perception.list",
        params: { sessionId },
      };

      this.ws.send(JSON.stringify(req));
      this.pending.set(this.id, { resolve, reject });

      this.id++;
    });
  }

  sendScheduler(
    sessionId: string,
    duration: number,
    actions: SchedulerAction[]
  ): Promise<SchedulerSendResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject("VCCPサーバーとの接続が確立されていません。");
      }

      const req: SchedulerSendRequest = {
        jsonrpc: "2.0",
        id: this.id,
        method: "scheduler.send",
        params: { sessionId, duration, actions },
      };

      this.ws.send(JSON.stringify(req));
      this.pending.set(this.id, { resolve, reject });

      this.id++;
    });
  }
}

export * from "./types";
