# CLAUDE.md

必ず日本語で回答してください。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the VRM Character Control Protocol (VCCP) v1.0 specification repository. VCCP is a minimal and extensible communication protocol for LLMs to control VRM character behaviors. The project focuses on protocol design and specification rather than implementation.

## Repository Structure

- `protocol.md`: Complete VCCP v1.0 specification document (Japanese)
  - Defines JSON-RPC 2.0 over WebSocket protocol
  - Core API with 3 methods: `core.execute`, `context.set`, `plugin.register`
  - Plugin architecture for extensibility
  - Standard action types: motion, expression, speech
  - Event system for notifications

## Architecture Philosophy

The protocol follows these core design principles:

- **Minimal Core API**: Only essential control functions in core
- **Plugin-Driven**: All advanced features implemented as plugins
- **Context-Centric**: All actions are context-aware and contextually driven
- **AI-Friendly**: Designed for LLM comprehension and usage

## Protocol Structure

### Core Communication

- Protocol: JSON-RPC 2.0 over WebSocket
- Message Format: JSON
- Base message structure includes `action`, `data`, and `context` parameters

### Core Methods

1. `core.execute` - Execute actions (motion, expression, speech, custom)
2. `context.set` - Manage global context state
3. `plugin.register` - Register plugin handlers

### Plugin System

- Plugins extend core functionality
- Standard naming: `plugin_name.method`
- Examples: `ai_motion.generate`, `emotion.analyze`, `gesture.generate`

## Development Commands

For prototype implementation in `protocol/` directory:
- `bun run dev` - Start development server with hot reload
- `bun install` - Install dependencies

## Development Notes

- This repository contains both specification (protocol.md) and prototype implementation (protocol/ directory)
- The specification is the primary focus, with TypeScript prototype serving as reference implementation
- Protocol prototype runs on http://localhost:3000 with WebSocket endpoint at ws://localhost:3000/vccp

## Implementation Architecture

### Code Structure

- `protocol/src/core.ts` - VCCPCore class handling JSON-RPC requests and core methods
- `protocol/src/plugin-manager.ts` - Plugin management and built-in plugin initialization
- `protocol/src/types.ts` - TypeScript type definitions for protocol interfaces
- `protocol/src/plugins/sample-plugin.ts` - Reference plugin implementations
- `protocol/src/index.ts` - Hono server with WebSocket support and test client

### Core Components

1. **VCCPCore**: Handles JSON-RPC 2.0 protocol, manages context state, executes actions
2. **PluginManager**: Manages built-in and external plugins, supports composite actions
3. **Built-in Plugins**: 
   - AIMotionGeneratorPlugin: Mock AI motion generation
   - EmotionAnalyzerPlugin: Text-based emotion analysis
   - GestureGeneratorPlugin: Cultural context-aware gesture generation

### Protocol Flow

1. WebSocket connection established to `/vccp` endpoint
2. JSON-RPC 2.0 messages processed by VCCPCore
3. Actions routed to standard handlers or plugins based on action name
4. Results returned via JSON-RPC response
5. Events broadcasted to all connected clients

## Key Concepts for Implementation

When working with VCCP implementations:

- All actions should be context-aware
- Plugin architecture allows infinite extensibility  
- Core remains minimal while plugins provide rich functionality
- Event system enables real-time feedback and state management
- Standard action types provide consistent interface across implementations
- Built-in plugins serve as reference implementations for external plugin development
