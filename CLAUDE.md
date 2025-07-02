# CLAUDE.md

必ず日本語で回答してください。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

VCCP (Virtual Character Control Protocol) is a JSON-RPC 2.0 based communication protocol that allows LLMs to control virtual characters. The project is structured as a Bun workspace monorepo with server implementation, client library, and examples including MCP integration.

## Development Commands

### Server Development

- `cd packages/vccp-server && bun run dev` - Start the VCCP server with hot reload (default port 3000)
- `bun install` - Install all workspace dependencies from the root directory

### Client Library Development

- `cd packages/vccp-client && bun run dev` - Start the client library with hot reload for development

### Example Development

- `cd examples/client && bun run dev` - Start the web-based test client with hot reload on port 8000
- `cd examples/mcp && bun run dev` - Start the MCP server example for LLM integration
- The web client demonstrates WebSocket connection to VCCP server and action registration
- The MCP server provides tools for LLMs to interact with VCCP clients

### Dependency Management

- This is a Bun workspace with separate packages and examples directories
- All dependencies are managed through the root workspace package.json
- Individual packages use their own scripts but share dependencies
- Internal packages reference each other using `workspace:*` syntax

## Architecture

### Project Structure

```
packages/
  vccp-server/          # Server implementation using Hono framework
    src/
      index.ts          # Main server entry point with WebSocket handling and JSON-RPC message routing
      schema/
        index.ts        # Zod schema definitions for all protocol types and validation
  vccp-client/          # Client library for connecting to VCCP servers
    index.ts            # Main client library with WebSocket wrapper and protocol handling
    
examples/
  client/               # Web-based test client with HTML interface
    src/
      index.ts          # Hono server serving static HTML client
  mcp/                  # Model Context Protocol server implementation
    src/
      index.ts          # MCP server providing VCCP tools for LLMs
```

### Core Components

**Server (`packages/vccp-server/`):**

- Built with Hono framework for Cloudflare Workers compatibility
- Uses WebSocket for real-time bidirectional communication at `/ws` endpoint
- Session-based architecture with in-memory Map storage for active sessions
- Implements complete JSON-RPC 2.0 protocol with proper error handling

**Client Library (`packages/vccp-client/`):**

- WebSocket-based client for connecting to VCCP servers
- Provides TypeScript interfaces for all protocol methods
- Built with ws library and Zod validation
- Used by MCP server and can be used by other client applications

**MCP Integration (`examples/mcp/`):**

- Model Context Protocol server that exposes VCCP functionality as MCP tools
- Allows LLMs to discover and control VCCP sessions through standardized interface
- Built with @modelcontextprotocol/sdk and Express
- Uses workspace vccp-client library internally

**Protocol Implementation:**

The server implements seven main JSON-RPC methods:

1. `register` - Creates new sessions and registers available actions with flexible JSON schemas
2. `action.list` - Retrieves all available actions for a given session (deprecated: use action.get)
3. `action.get` - Retrieves available actions for a given session or specific action details
4. `action.play` - Executes actions by forwarding them to the registered WebSocket client
5. `perception.set` - Records perception information categorized by type
6. `perception.category` - Retrieves the latest perception information for a specific category
7. `perception.list` - Retrieves all perception information for a session

**Session Management:**

- Sessions are identified by UUIDv7 for temporal ordering
- Each session contains a WebSocket context, array of available actions, and categorized perception data
- Automatic cleanup on WebSocket disconnection

### Key Files

- `packages/vccp-server/src/index.ts` - Complete JSON-RPC message handler with method routing and WebSocket endpoint
- `packages/vccp-server/src/schema/index.ts` - Complete type system with Zod validation schemas for all requests and session data structures
- `packages/vccp-client/index.ts` - Client library implementation with WebSocket wrapper and protocol methods
- `examples/mcp/src/index.ts` - MCP server implementation providing VCCP tools for LLM integration

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

### Testing and Deployment

- No formal test framework is configured - testing is done manually with example clients
- No build scripts are configured - packages run directly with Bun's TypeScript support
- No linting tools are configured (ESLint, Prettier, etc.)
- Server is designed for Cloudflare Workers deployment compatibility
- Local development uses `bun run --hot` for automatic restart on file changes
- Web client example runs on port 8000, server on port 3000 by default
- MCP server can be integrated with LLM clients that support Model Context Protocol
