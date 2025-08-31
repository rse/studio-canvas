
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Studio-Canvas is a real-time virtual studio canvas rendering application
with client/server architecture. It uses TypeScript throughout, Vue.js
for the control interface, and Babylon.js for 3D rendering.

## Commands

All development commands use the STX build tool configured in `etc/stx.conf`:

### Development
- `npm start dev` - Run development environment with live reload (builds client/server and starts server)
- `npm start build-dev` - Build development versions of client and server
- `npm start server-dev` - Run server in development mode with live reload

### Production
- `npm start build` - Build production versions
- `npm start server` - Run production server

### Linting and Type Checking
- `npm start lint` - Run all linters (TypeScript, ESLint, Biome, Stylelint, HTMLlint)
- `npm start lint-tsc` - TypeScript type checking for server
- `npm start lint-vue-tsc` - TypeScript type checking for Vue client
- `npm start lint-eslint` - ESLint for Vue/TypeScript files
- `npm start lint-biome` - Biome linting
- `npm start lint-stylelint` - Stylelint for styles

### Individual Components
- `npm start build-client` / `npm start build-client-dev` - Build client only
- `npm start build-server` / `npm start build-server-dev` - Build server only

## Architecture

### Directory Structure
- `src/server/` - Node.js/Hapi server with REST API and WebSocket support
- `src/client/` - Vue.js SPA with two modes: control interface and Babylon.js renderer
- `src/common/` - Shared TypeScript interfaces and utilities
- `etc/` - Build configuration files (Vite, TypeScript, linting configs)
- `dst/` - Built output directory

### Key Components

**Server** (`src/server/`):
- Dependency injection using Awilix container
- Hapi.js REST API with WebSocket support
- FreeD protocol support for PTZ camera tracking
- Database abstraction layer
- Modular REST endpoints for canvas, media, state, presets, mixer, viewpoints

**Client Architecture**:
- **Control Mode**: Vue.js interface for real-time parameter adjustment
- **Render Mode**: Babylon.js 3D engine for canvas rendering
- Shared state management via WebSocket connection
- PTZ camera integration with FreeD data

**Common** (`src/common/`): 
Shared TypeScript interfaces for state management, media handling, viewpoints, and canvas configuration.

### Build System
- Uses Vite for both client and server bundling
- Separate TypeScript configs for client/server
- Development mode supports live reload for both components
- Production builds optimized for deployment

### Client Modes
Access via URLs:
- Control: `https://127.0.0.1:12345/`
- Render: `https://127.0.0.1:12345/#/render/back/CAM2?ptzFreeD=true`

### Dependencies
- **Frontend**: Vue 3, Babylon.js, various UI components (@vueform/slider, vue-tippy)
- **Backend**: Hapi.js with plugins, Awilix DI, WebSocket support
- **Build**: Vite, TypeScript, comprehensive linting stack (ESLint, Biome, Oxlint)

