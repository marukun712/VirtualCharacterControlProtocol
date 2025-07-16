// hello-vccp.ts
import { VCCPClient, Action, ExecuteParams } from 'vccp-client';

const actions: Action[] = [
    {
        title: "Hello World",
        description: "Send a greeting message",
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Name of the person to greet",
            }
        },
        required: [],
    },
];
const WS_URL = "ws://localhost:3000/ws";

async function helloVCCP() {
    const client = new VCCPClient(
        { url: WS_URL },
        {
            onOpen: () => { },
            onMessage: (event) => {
                console.log("Message received from server");
                console.log(event);
            },
            onExecute: (params: ExecuteParams) => {
                console.log("Execute params received:", params);
                switch (params.type) {
                    case "play":
                        switch (params.action) {
                            case "Hello World":
                                const name = "World";
                                console.log(`Hello, ${name}!`);
                                return { result: `Hello, ${name}!` };
                            default:
                                console.error("Unknown action:", params.action);
                                return { error: "Unknown action" };
                        }
                    case "scheduler":
                        console.log("Scheduler actions received:", params.actions);
                        break;
                    default:
                        console.error("Unknown action type:", params);
                }
            },
            onError: (error: string) => {
                console.error(error);
            },
        }
    );

    // サーバーに接続
    await client.connect();

    // セッションを登録（簡単なアクションを定義）
    const sessionId = await client.register(actions);

    console.log(`セッションID: ${sessionId.result.sessionId}`);
}

helloVCCP();