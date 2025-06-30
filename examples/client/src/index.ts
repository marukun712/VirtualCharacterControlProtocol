import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

// 静的ファイル配信
app.use("/static/*", serveStatic({ root: "./" }));

// メインページ
app.get("/", (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VCCP Test Client</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .connection-status {
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .connected {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .disconnected {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select, textarea, button {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        button {
            background-color: #007bff;
            color: white;
            border: none;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover {
            background-color: #0056b3;
        }
        button:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        .message-log {
            height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 10px;
            background-color: #f8f9fa;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
        .message-item {
            margin-bottom: 10px;
            padding: 5px;
            border-radius: 3px;
        }
        .sent {
            background-color: #e3f2fd;
            border-left: 3px solid #2196f3;
        }
        .received {
            background-color: #f3e5f5;
            border-left: 3px solid #9c27b0;
        }
        .error {
            background-color: #ffebee;
            border-left: 3px solid #f44336;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <h1>VCCP Test Client</h1>
    
    <div class="container">
        <h2>接続設定</h2>
        <div class="form-group">
            <label for="serverUrl">サーバーURL:</label>
            <input type="text" id="serverUrl" value="ws://localhost:3000/ws" placeholder="ws://localhost:3000/ws">
        </div>
        <button id="connectBtn">接続</button>
        <button id="disconnectBtn" disabled>切断</button>
        <div id="connectionStatus" class="connection-status disconnected">未接続</div>
    </div>

    <div class="grid">
        <div class="container">
            <h2>メッセージ送信</h2>
            <div class="form-group">
                <label for="methodSelect">メソッド:</label>
                <select id="methodSelect">
                    <option value="register">register</option>
                    <option value="action.list">action.list</option>
                    <option value="action.get">action.get</option>
                    <option value="action.play">action.play</option>
                    <option value="perception.set">perception.set</option>
                    <option value="perception.category">perception.category</option>
                    <option value="perception.list">perception.list</option>
                </select>
            </div>
            <div class="form-group">
                <label for="messageParams">パラメータ (JSON):</label>
                <textarea id="messageParams" rows="8" placeholder='{"sessionId": "your-session-id"}'></textarea>
            </div>
            <button id="sendBtn" disabled>送信</button>
            <button id="clearLogBtn">ログクリア</button>
        </div>

        <div class="container">
            <h2>メッセージログ</h2>
            <div id="messageLog" class="message-log"></div>
        </div>
    </div>

    <div class="container">
        <h2>プリセットメッセージ</h2>
        <button class="preset-btn" data-method="register" data-params='{"actions": [{"title": "move", "description": "キャラクターを指定した座標に移動させる", "type": "object", "properties": {"x": {"description": "x座標", "type": "integer"}, "y": {"description": "y座標", "type": "integer"}, "z": {"description": "z座標", "type": "integer"}}}]}'>サンプル登録</button>
        <button class="preset-btn" data-method="action.list" data-params='{"sessionId": "SESSION_ID"}'>アクション一覧</button>
        <button class="preset-btn" data-method="action.get" data-params='{"sessionId": "SESSION_ID", "action": "move"}'>アクション取得</button>
        <button class="preset-btn" data-method="action.play" data-params='{"sessionId": "SESSION_ID", "action": "move", "properties": {"x": 5, "y": 0, "z": 5}}'>アクション実行</button>
        <button class="preset-btn" data-method="perception.set" data-params='{"sessionId": "SESSION_ID", "category": "object", "perception": "椅子がx:2,y:2,z:0にあります"}'>知覚情報記録</button>
        <button class="preset-btn" data-method="perception.category" data-params='{"sessionId": "SESSION_ID", "category": "object"}'>知覚情報取得(カテゴリ)</button>
        <button class="preset-btn" data-method="perception.list" data-params='{"sessionId": "SESSION_ID"}'>知覚情報一覧</button>
    </div>

    <script>
        let ws = null;
        let messageId = 1;
        let currentSessionId = null;

        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const connectionStatus = document.getElementById('connectionStatus');
        const serverUrl = document.getElementById('serverUrl');
        const methodSelect = document.getElementById('methodSelect');
        const messageParams = document.getElementById('messageParams');
        const sendBtn = document.getElementById('sendBtn');
        const clearLogBtn = document.getElementById('clearLogBtn');
        const messageLog = document.getElementById('messageLog');

        function updateConnectionStatus(connected) {
            if (connected) {
                connectionStatus.textContent = '接続中';
                connectionStatus.className = 'connection-status connected';
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                sendBtn.disabled = false;
            } else {
                connectionStatus.textContent = '未接続';
                connectionStatus.className = 'connection-status disconnected';
                connectBtn.disabled = false;
                disconnectBtn.disabled = true;
                sendBtn.disabled = true;
            }
        }

        function addMessageToLog(message, type) {
            const messageItem = document.createElement('div');
            messageItem.className = \`message-item \${type}\`;
            messageItem.innerHTML = \`
                <div style="font-weight: bold; margin-bottom: 5px;">\${new Date().toLocaleTimeString()} - \${type.toUpperCase()}</div>
                <pre style="margin: 0; white-space: pre-wrap;">\${JSON.stringify(message, null, 2)}</pre>
            \`;
            messageLog.appendChild(messageItem);
            messageLog.scrollTop = messageLog.scrollHeight;
        }

        connectBtn.addEventListener('click', () => {
            const url = serverUrl.value;
            ws = new WebSocket(url);
            
            ws.onopen = () => {
                updateConnectionStatus(true);
                addMessageToLog({ event: 'WebSocket接続が確立されました' }, 'received');
            };
            
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    addMessageToLog(message, 'received');
                    
                    // registerメソッドの応答からsessionIdを取得
                    if (message.result && message.result.sessionId) {
                        currentSessionId = message.result.sessionId;
                        addMessageToLog({ info: \`Session ID が設定されました: \${currentSessionId}\` }, 'received');
                    }
                } catch (e) {
                    addMessageToLog({ error: 'JSON解析エラー', data: event.data }, 'error');
                }
            };
            
            ws.onerror = (error) => {
                addMessageToLog({ error: 'WebSocketエラー', details: error }, 'error');
            };
            
            ws.onclose = () => {
                updateConnectionStatus(false);
                addMessageToLog({ event: 'WebSocket接続が切断されました' }, 'received');
            };
        });

        disconnectBtn.addEventListener('click', () => {
            if (ws) {
                ws.close();
            }
        });

        sendBtn.addEventListener('click', () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                alert('WebSocketが接続されていません');
                return;
            }

            try {
                const method = methodSelect.value;
                let params = messageParams.value.trim();
                
                if (params) {
                    params = JSON.parse(params);
                    
                    // SESSION_IDプレースホルダーを現在のセッションIDに置換
                    if (currentSessionId) {
                        params = JSON.parse(JSON.stringify(params).replace(/SESSION_ID/g, currentSessionId));
                    }
                } else {
                    params = {};
                }

                const message = {
                    jsonrpc: '2.0',
                    id: messageId++,
                    method: method,
                    params: params
                };

                ws.send(JSON.stringify(message));
                addMessageToLog(message, 'sent');
            } catch (e) {
                addMessageToLog({ error: 'メッセージ送信エラー', details: e.message }, 'error');
            }
        });

        clearLogBtn.addEventListener('click', () => {
            messageLog.innerHTML = '';
        });

        // プリセットボタンの処理
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const method = btn.dataset.method;
                const params = btn.dataset.params;
                
                methodSelect.value = method;
                messageParams.value = params;
            });
        });

        // メソッド選択時のデフォルトパラメータ設定
        methodSelect.addEventListener('change', () => {
            const method = methodSelect.value;
            let defaultParams = '';
            
            switch (method) {
                case 'register':
                    defaultParams = '{"actions": []}';
                    break;
                case 'action.list':
                case 'perception.category':
                case 'perception.list':
                    defaultParams = '{"sessionId": "SESSION_ID"}';
                    break;
                case 'action.get':
                    defaultParams = '{"sessionId": "SESSION_ID", "action": "move"}';
                    break;
                case 'action.play':
                    defaultParams = '{"sessionId": "SESSION_ID", "action": "move", "properties": {}}';
                    break;
                case 'perception.set':
                    defaultParams = '{"sessionId": "SESSION_ID", "category": "object", "perception": ""}';
                    break;
            }
            
            messageParams.value = defaultParams;
        });

        // 初期状態を設定
        updateConnectionStatus(false);
        methodSelect.dispatchEvent(new Event('change'));
    </script>
</body>
</html>
  `);
});

export default app;
