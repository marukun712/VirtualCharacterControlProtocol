import { Context, Hono } from "hono";
import { createBunWebSocket } from "hono/bun";

import { VCCPCore } from "./core";
import { PluginManager } from "./plugin-manager";
import { JSONRPCRequest } from "./types";

type WebSocketType = {
  send: (data: string) => void;
  readyState: number;
};

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();
const vccpCore = new VCCPCore();
const pluginManager = new PluginManager(vccpCore);

// プラグインの初期化
pluginManager.initializeDefaultPlugins().catch(console.error);

// WebSocket接続の管理
const connections = new Set<WebSocketType>();

// イベントハンドラーの設定（WebSocketクライアントへの通知用）
vccpCore.onEvent((event) => {
  const notification = {
    jsonrpc: "2.0",
    method: "event",
    params: event,
  };

  // 全接続にイベントを送信
  connections.forEach((ws) => {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(notification));
    }
  });
});

app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>VCCP Server</title>
    </head>
    <body>
      <h1>VRM Character Control Protocol Server</h1>
      <p>WebSocket endpoint: ws://localhost:3000/vccp</p>
      <div id="status">
        <h2>Server Status</h2>
        <pre id="status-content"></pre>
      </div>
      <div id="test">
        <h2>Test Client</h2>
        <button onclick="connectWebSocket()">Connect</button>
        <button onclick="testExecute()">Test Execute</button>
        <button onclick="testContext()">Test Context</button>
        <button onclick="testPlugin()">Test Plugin</button>
        <button onclick="testAIMotion()">Test AI Motion</button>
        <button onclick="testEmotion()">Test Emotion</button>
        <button onclick="testGesture()">Test Gesture</button>
        <div id="log"></div>
      </div>
      
      <script>
        let ws = null;
        
        function connectWebSocket() {
          ws = new WebSocket('ws://localhost:3000/vccp');
          
          ws.onopen = function() {
            log('Connected to VCCP server');
          };
          
          ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            log('Received: ' + JSON.stringify(data, null, 2));
          };
          
          ws.onclose = function() {
            log('Connection closed');
          };
        }
        
        function testExecute() {
          if (!ws) return;
          const message = {
            jsonrpc: '2.0',
            method: 'core.execute',
            params: {
              action: 'motion',
              data: { type: 'name', value: 'wave' },
              context: { emotion: 'happy' }
            },
            id: Date.now()
          };
          ws.send(JSON.stringify(message));
        }
        
        function testContext() {
          if (!ws) return;
          const message = {
            jsonrpc: '2.0',
            method: 'context.set',
            params: {
              context: { mood: 'excited', location: 'home' }
            },
            id: Date.now()
          };
          ws.send(JSON.stringify(message));
        }
        
        function testPlugin() {
          if (!ws) return;
          const registerMessage = {
            jsonrpc: '2.0',
            method: 'plugin.register',
            params: {
              name: 'test_plugin',
              handlers: {
                'custom_action': 'http://localhost:8080/custom'
              }
            },
            id: Date.now()
          };
          ws.send(JSON.stringify(registerMessage));
        }
        
        function testAIMotion() {
          if (!ws) return;
          const message = {
            jsonrpc: '2.0',
            method: 'core.execute',
            params: {
              action: 'ai_motion.generate',
              data: { 
                prompt: '驚いて後ずさりする',
                style: 'realistic'
              },
              context: { 
                current_pose: 'standing',
                emotional_state: 'surprised'
              }
            },
            id: Date.now()
          };
          ws.send(JSON.stringify(message));
        }
        
        function testEmotion() {
          if (!ws) return;
          const message = {
            jsonrpc: '2.0',
            method: 'core.execute',
            params: {
              action: 'emotion.analyze',
              data: { 
                text: '今日は本当に楽しかった！',
                voice_data: null
              },
              context: { 
                conversation_history: []
              }
            },
            id: Date.now()
          };
          ws.send(JSON.stringify(message));
        }
        
        function testGesture() {
          if (!ws) return;
          const message = {
            jsonrpc: '2.0',
            method: 'core.execute',
            params: {
              action: 'gesture.generate',
              data: { 
                description: 'greeting gesture',
                cultural_background: 'japanese'
              },
              context: { 
                situation: 'meeting'
              }
            },
            id: Date.now()
          };
          ws.send(JSON.stringify(message));
        }
        
        function log(message) {
          const logDiv = document.getElementById('log');
          logDiv.innerHTML += '<div>' + new Date().toLocaleTimeString() + ': ' + message + '</div>';
          logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        // ステータス更新
        setInterval(async () => {
          try {
            const response = await fetch('/status');
            const status = await response.json();
            document.getElementById('status-content').textContent = JSON.stringify(status, null, 2);
          } catch (e) {
            console.error('Status update failed:', e);
          }
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

app.get("/status", (c) => {
  return c.json({
    ...vccpCore.getStatus(),
    connections: connections.size,
    uptime: process.uptime(),
  });
});

app.get(
  "/vccp",
  upgradeWebSocket(() => {
    return {
      onMessage: async (event, ws) => {
        try {
          const request: JSONRPCRequest = JSON.parse(event.data.toString());
          console.log("Received request:", request);

          const response = await vccpCore.handleRequest(request);
          console.log("Sending response:", response);

          ws.send(JSON.stringify(response));
        } catch (error) {
          console.error("WebSocket message error:", error);

          const errorResponse = {
            jsonrpc: "2.0",
            error: {
              code: -32700,
              message: "Parse error",
              data: error instanceof Error ? error.message : "Unknown error",
            },
            id: null,
          };

          ws.send(JSON.stringify(errorResponse));
        }
      },

      onOpen: (event, ws) => {
        console.log("WebSocket connection opened");
        connections.add(ws);
      },

      onClose: (event, ws) => {
        console.log("WebSocket connection closed");
        connections.delete(ws);
      },
    };
  })
);

Bun.serve({
  fetch: app.fetch,
  websocket,
});
