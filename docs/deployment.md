# Deployment Guide

## What Runs in Production

The production topology is intentionally small and scalable:

- `app`: Express + Socket.IO web server
- `worker`: background job processor for uploads and async tasks
- `postgres`: primary relational database
- `redis`: presence, pub/sub, and queue support
- `coturn`: WebRTC NAT traversal support

The repository already includes a working `docker-compose.yml` for local infrastructure. This document describes how to run the stack cleanly in development and what to configure for production.

## Environment Variables

Minimum required values:

```bash
PORT=3000
NODE_ENV=production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=chat_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
SOCKET_IO_CORS_ORIGIN=http://localhost:3000
TRUST_PROXY=1
```

Optional production integrations:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
FIREBASE_SERVICE_ACCOUNT_JSON={...}
TURN_EXTERNAL_IP=your-public-ip
TURN_USERS=user:password
SOCKET_IO_ADAPTER=redis
```

## Local Development

1. Start services:

```bash
docker compose up -d postgres redis coturn
```

2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm start
```

4. Open `http://localhost:3000`.

## Production Container Run

Build and run the app image:

```bash
docker build -t chat-app:latest .
docker run --rm -p 3000:3000 --env-file .env chat-app:latest
```

Run the worker alongside it:

```bash
docker run --rm --env-file .env chat-app:latest npm run worker
```

## Docker Compose Production Pattern

Use the same app image for the main server and worker. In production, place them behind a reverse proxy or load balancer and do not expose PostgreSQL or Redis publicly.

Recommended external controls:

- TLS termination at the edge proxy or load balancer
- Sticky sessions if Socket.IO is not using a shared session strategy
- Health checks on `/health`
- Horizontal scaling only after Redis adapter and TURN are confirmed

## Scaling Guidance

- Keep PostgreSQL as the source of truth.
- Keep Redis for ephemeral state only.
- Do not persist presence in PostgreSQL.
- Use the worker for expensive media or scanning jobs.
- Add CDN/object storage for media delivery when S3 is enabled.
- Keep Socket.IO events small and acknowledgement-based.

## Security Guidance

- Use HTTPS everywhere.
- Set a strong `JWT_SECRET` and rotate refresh secrets when needed.
- Restrict `SOCKET_IO_CORS_ORIGIN` to real application origins.
- Never expose Redis or PostgreSQL directly to the public internet.
- Prefer signed uploads and signed downloads for private media.

## Operations Checklist

- Monitor application logs.
- Watch PostgreSQL connection counts.
- Watch Redis memory and eviction behavior.
- Confirm TURN is reachable from mobile networks.
- Verify browser push permissions and token registration if notifications are enabled.
- Run `npm test` before every release.