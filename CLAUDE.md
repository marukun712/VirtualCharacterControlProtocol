# CLAUDE.md

必ず日本語で回答してください。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

VCCP (Virtual Character Control Protocol) is a JSON-RPC 2.0 based communication protocol that allows LLMs to control virtual characters. The project is structured as a monorepo with packages for server implementation.

## Development Commands

### Server Development

- `cd packages/vccp-server && bun run dev` - Start the development server with hot reload
- The server runs on WebSocket connections at `/ws` endpoint

### Package Management

- This is a Bun workspace project with packages in `packages/` directory
- Use `bun install` in the root to install all dependencies
- Individual packages can be developed independently

## Architecture

### Project Structure

```
packages/
  vccp-server/          # Server implementation using Hono framework
    src/
      index.ts          # Main server entry point with WebSocket handling
      schema/
        index.ts        # Type definitions for Session and protocol schemas
```

### Core Components

**Server (`packages/vccp-server/`):**

- Built with Hono framework for Cloudflare Workers compatibility
- Uses WebSocket for real-time communication
- Session-based architecture with in-memory session storage
- Implements JSON-RPC 2.0 protocol for character control

**Protocol Implementation:**

- `register` method: Establishes new sessions and registers available actions
- `actions` method: Retrieves available actions for a session
- Action schema supports arbitrary parameters defined by clients
- Session management via UUID-based session IDs

### Key Files

- `packages/vccp-server/src/index.ts:9-22` - WebSocket connection handling
- `packages/vccp-server/src/schema/index.ts:3-6` - Session type definition with WebSocket context

### Protocol Specification

The protocol follows JSON-RPC 2.0 standard with two main methods:

1. **register**: Creates sessions and registers actions with flexible schemas
2. **actions**: Returns available actions for a given session

Actions are defined with:

- `name`: Action identifier
- `description`: Human-readable description
- `params`: Parameter schema (Record<string,any>)

### Technical Stack

- **Runtime**: Bun
- **Framework**: Hono (optimized for edge deployment)
- **Validation**: Zod
- **Protocol**: JSON-RPC 2.0 over WebSocket
- **TypeScript**: Strict mode enabled with JSX support for Hono

### Development Notes

- The codebase includes Japanese comments and documentation
- Server is designed for Cloudflare Workers deployment
- Session state is currently stored in memory (not persistent)
- WebSocket connections handle both protocol messages and raw communication
