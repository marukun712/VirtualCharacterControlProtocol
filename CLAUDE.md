# CLAUDE.md

必ず日本語で回答してください。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

VCCP (Virtual Character Control Protocol) is a JSON-RPC 2.0 based communication protocol that allows LLMs to control virtual characters. The project is structured as a Bun workspace monorepo with server implementation and examples.

## Development Commands

### Server Development

- `cd packages/vccp-server && bun run dev` - Start the development server with hot reload on port 3000
- `bun install` - Install all workspace dependencies from the root directory

### Package Management

- This is a Bun workspace project with packages in `packages/` and `examples/` directories
- All dependencies are managed through the root workspace
- Individual packages can be developed independently

## Architecture

### Project Structure

```
packages/
  vccp-server/          # Server implementation using Hono framework
    src/
      index.ts          # Main server entry point with WebSocket handling and JSON-RPC message routing
      schema/
        index.ts        # Zod schema definitions for all protocol types and validation
```

### Core Components

**Server (`packages/vccp-server/`):**

- Built with Hono framework for Cloudflare Workers compatibility
- Uses WebSocket for real-time bidirectional communication at `/ws` endpoint
- Session-based architecture with in-memory Map storage for active sessions
- Implements complete JSON-RPC 2.0 protocol with proper error handling

**Protocol Implementation:**

The server implements six main JSON-RPC methods:

1. `register` - Creates new sessions and registers available actions with flexible JSON schemas
2. `action.get` - Retrieves available actions for a given session
3. `action.play` - Executes actions by forwarding them to the registered WebSocket client
4. `perception.set` - Records perception information categorized by type
5. `perception.category` - Retrieves the latest perception information for a specific category
6. `perception.list` - Retrieves all perception information for a session

**Session Management:**

- Sessions are identified by UUIDv7 for temporal ordering
- Each session contains a WebSocket context, array of available actions, and categorized perception data
- Automatic cleanup on WebSocket disconnection

### Key Files

- `packages/vccp-server/src/index.ts:20-307` - Complete JSON-RPC message handler with method routing for all 6 protocol methods
- `packages/vccp-server/src/index.ts:309-327` - WebSocket endpoint with connection lifecycle management
- `packages/vccp-server/src/schema/index.ts` - Complete type system with Zod validation schemas for all requests and session data structures

### Protocol Flow

1. Client connects to WebSocket endpoint `/ws`
2. Client sends `register` request with available actions and their schemas
3. Server creates session and returns sessionId
4. External LLM can query `action.get` to discover capabilities
5. LLM sends `action.play` requests to execute actions on the original client
6. Client can use `perception.set` to record environmental data categorized by type
7. LLM can retrieve perception data via `perception.category` (latest for specific category) or `perception.list` (all data)
8. Session automatically cleaned up on disconnect

### Technical Stack

- **Runtime**: Bun with workspace support
- **Framework**: Hono with Cloudflare Workers WebSocket adapter
- **Validation**: Zod for runtime type checking and schema validation, AJV for action parameter validation  
- **Protocol**: JSON-RPC 2.0 over WebSocket with comprehensive error handling
- **UUID**: UUIDv7 for session identification with temporal ordering

### Development Notes

- The codebase uses Japanese for documentation and comments
- Server is designed for edge deployment (Cloudflare Workers)
- Session state is stored in memory only (not persistent across restarts)
- Actions support arbitrary parameter schemas defined by clients using JSON Schema
- Perception data is categorized and stored per session for environmental awareness
- WebSocket connections handle both JSON-RPC protocol and raw action forwarding
