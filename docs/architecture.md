# Architecture Overview

## System Summary

Chat-APP is a modular real-time communication platform built on Node.js, Express, Socket.IO, PostgreSQL, Redis, and WebRTC. PostgreSQL is the source of truth for persistent domain data, Redis handles low-latency presence and adapter/pub-sub workloads, and the browser client renders the chat experience with vanilla HTML, CSS, and JavaScript.

## Core Layers

### Frontend
- `public/index.html` provides the app shell.
- `public/css/style.css` implements the responsive design system, mobile drawer, chat surfaces, call overlay, toast layer, and premium interaction states.
- `public/js/main.js` manages Socket.IO connection bootstrap, authentication token acquisition, room joins, message rendering, reactions, uploads, call signaling, notifications, and mobile navigation.

### HTTP API
- `src/app.js` configures Express, middleware, security headers, static asset delivery, and route registration.
- `src/routes/index.js` exposes health, auth, room, upload, config, friend, reaction, device, and config endpoints.
- `src/controllers/*` contains request handlers.
- `src/middleware/*` handles validation, auth, and error handling.

### Realtime Layer
- `src/index.js` creates the HTTP server and Socket.IO instance.
- `src/socket.js` registers connection handling, room joins, typing, messages, reactions, presence, and WebRTC signaling.
- Redis adapter support is optional and controlled by configuration so the app can scale horizontally without changing application code.

### Data Layer
- `src/db/index.js` initializes PostgreSQL, manages schema bootstrap/migrations, and exposes the pool.
- `src/services/*` contains persistence and business logic for users, rooms, messages, tokens, notifications, and uploads.
- Redis tracks presence, socket state, and background queue work.

### Background Processing
- `src/worker/worker.js` consumes queued upload jobs.
- The worker model keeps the request path fast and gives room for thumbnailing, scanning, and media processing.

## Authentication Flow

1. The client requests a guest token or signs in with email/password or Google ID token.
2. The server issues access and refresh tokens.
3. HTTP requests use `Authorization: Bearer ...`.
4. Socket.IO handshakes also carry the token and are authenticated before the socket can join rooms.
5. Refresh tokens are persisted in PostgreSQL so sessions can be revoked.

## Realtime Event Flow

1. A user joins a room via `room:join`.
2. The server loads historical messages and current members.
3. Typing, message creation, reactions, and call events are broadcast to the room.
4. Presence is updated in Redis and mirrored to connected clients.
5. When Redis adapter mode is enabled, events and presence propagate across app instances.

## WebRTC Flow

- Clients negotiate calls through Socket.IO signaling events.
- The server acts as a signaling relay and does not terminate media.
- STUN/TURN configuration is served to the client from `/api/config`.
- The current compose setup includes coturn for NAT traversal.

## Storage Model

- PostgreSQL stores users, rooms, messages, sessions, device tokens, friendships, friend requests, and reactions.
- Redis stores ephemeral state such as presence and queue payloads.
- File uploads support direct-to-object-storage presigning when S3 is configured, with a server fallback for local development.

## Scalability Notes

- Socket.IO can be scaled horizontally by enabling the Redis adapter and ensuring the deployment uses sticky sessions or a shared transport strategy.
- Presence should remain ephemeral and Redis-backed rather than persisted in PostgreSQL.
- Long-running media or security tasks should move into background workers instead of request handlers.
- Read-heavy list views should be paginated or virtualized as histories grow.

## Production Priorities

- Keep authentication centralized and token-based.
- Keep UI state optimistic but reconcile through server acknowledgements.
- Use Redis for ephemeral coordination, PostgreSQL for truth, and object storage for durable media.
- Keep client-side listeners cleaned up when components or room contexts change.