import { VCCPClient, Action, ExecuteParams } from 'vccp-client';

// Defining actions based on JSON Schema
const actions: Action[] = [
    {
        title: "Hello World",
        description: "Send a greeting message",
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Name of the person to greet",
            },
            messages: {
                type: "array",
                description: "Other messages",
                items: {
                    type: "string",
                    description: "A message",
                }

            }
        },
        required: ["name"],
    },
];

// packages/vccp-server URL
const WS_URL = "ws://localhost:3000/ws";

async function helloVCCP() {
    const client = new VCCPClient(
        { url: WS_URL },
        {
            onOpen: () => { },
            onMessage: () => { },
            onExecute: (params: ExecuteParams) => {
                // Handle the execution
                console.log("Execute params received:", params);
                switch (params.type) {
                    case "play":
                        // Handle play actions
                        switch (params.action) {
                            case "Hello World": // Handle the Hello World action
                                const name = params.properties.name;
                                const messages = params.properties.messages || [];
                                console.log(`Hello, ${name}!`, `Messages: ${messages.join(", ")}`);
                                break;
                            default:
                                console.error("Unknown action:", params.action);
                                break;
                        }
                    case "scheduler":
                        // Handle scheduler actions
                        console.log("Scheduler actions received:", params);
                        break;
                    default:
                        console.error("Unknown action type:", params);
                        break;
                }
            },
            onError: (error: string) => {
                console.error(error);
            },
        }
    );

    // Connect to the VCCP server
    console.log("Connecting to VCCP server...");
    await client.connect();

    // Register the session with the defined actions
    console.log("Registering VCCP session with actions...");
    const sessionId = await client.register(actions);

    console.log("VCCP Session registered successfully.");
    console.log(`Session ID: ${sessionId.result.sessionId}`);
}

helloVCCP();