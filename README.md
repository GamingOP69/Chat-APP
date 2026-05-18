README.md

Project Overview
================

This is a real-time web messaging platform inspired by WhatsApp Web, Messenger, Discord, Telegram Web, and WeChat Web. The platform is built using Node.js, Express.js, Socket.IO, PostgreSQL, Redis, and WebRTC.

Setup Instructions
==================

1. Install Node.js and npm on your system.
2. Clone the repository using `git clone https://github.com/GamingOP69/Chat-APP.git`.
3. Navigate to the project directory using `cd Chat-APP`.
4. Copy `.env.example` to `.env` and update values as needed.
5. Start PostgreSQL and Redis with Docker using `docker compose up -d` or run `./start-all.sh`.
6. Install dependencies using `npm install`.
7. Build static assets using `npm run build`.
8. Start the server using `npm start`.
9. Open a web browser and navigate to `http://localhost:3000`.

Alternative one-step startup:

```bash
./start-all.sh
```

Project Structure
================

The project is organized into the following folders:

* `app`: Contains the Express.js application code.
* `config`: Contains configuration files for the database, Redis, and other settings.
* `controllers`: Contains controller functions for handling HTTP requests.
* `models`: Contains database schema definitions using Sequelize.
* `routes`: Contains route definitions for the application.
* `services`: Contains service functions for handling business logic.
* `socket`: Contains Socket.IO event handlers.
* `utils`: Contains utility functions for tasks such as file uploads and validation.
* `public`: Contains static assets such as HTML, CSS, and JavaScript files.
* `views`: Contains template files for rendering HTML pages.

Database Schema
==============

The database schema is defined using Sequelize and is located in `models/index.js`. The schema includes tables for users, rooms, messages, attachments, and call logs.

Redis Integration
================

Redis is used for presence tracking, typing indicators, and socket-user mapping. The Redis integration is handled by the `redis` package and is configured in `config/redis.js`.

# Chat-APP

Chat-APP is a real-time communication platform built with Node.js, Express, Socket.IO, PostgreSQL, Redis, and WebRTC. The current codebase includes authenticated HTTP and Socket.IO flows, room messaging, reactions, uploads, guest and Google sign-in support, browser notifications, voice/video calling, Redis-backed presence, and a responsive premium UI.

## Highlights

- Real-time rooms, messages, typing, reactions, and call signaling
- JWT auth with guest, email/password, refresh token, and Google sign-in support
- PostgreSQL-backed persistence with Redis for presence and coordination
- Direct-to-S3 presigned upload support with local fallback uploads
- Browser notification toggle and message sound feedback
- Responsive mobile-first UI with sidebar drawer behavior
- Docker Compose setup for PostgreSQL, Redis, and coturn
- Background worker for queued upload jobs

## Quick Start

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis coturn
npm start
```

Open `http://localhost:3000`.

## Scripts

- `npm start` - run the app server
- `npm run worker` - run the background worker
- `npm test` - run the integration test suite
- `npm run lint` - run ESLint
- `npm run build` - copy static assets into `dist/`
- `npm run docker:up` - start local services
- `npm run docker:down` - stop local services

## Architecture

See [docs/architecture.md](docs/architecture.md) for the current system design and [docs/deployment.md](docs/deployment.md) for production and local deployment guidance.

## Environment

The app supports the following major integrations when configured:

- `JWT_SECRET` and `JWT_REFRESH_SECRET` for session security
- `GOOGLE_CLIENT_ID` for Google sign-in verification
- `AWS_*` variables for S3 uploads
- `FIREBASE_SERVICE_ACCOUNT_JSON` for push notification delivery
- `SOCKET_IO_ADAPTER=redis` for horizontal Socket.IO scaling
- `TURN_EXTERNAL_IP` and `TURN_USERS` for coturn production use

## Tests

```bash
npm test
```

The repository includes a focused integration suite that exercises HTTP, Socket.IO, WebRTC signaling, uploads, Redis, and PostgreSQL connectivity.
The future improvements include measures such as adding new features, improving performance, and enhancing security. The future improvements are tracked in the `TODO.md` file.

Full Runnable Code
==================

The full runnable code is included in this repository and can be run by following the setup instructions.

Setup Instructions for Developers
==================================

1. Install Node.js and npm on your system.
2. Clone the repository using `git clone https://github.com/your-repo/realtime-messaging-platform.git`.
3. Navigate to the project directory using `cd realtime-messaging-platform`.
4. Install dependencies using `npm install`.
5. Create a PostgreSQL database and update the database credentials in `config/database.js`.
6. Create a Redis instance and update the Redis credentials in `config/redis.js`.
7. Start the server using `npm start`.
8. Open a web browser and navigate to `http://localhost:3000` to access the platform.

Commit Message Guidelines
=======================

* Use the imperative mood (e.g. "Fix bug" instead of "Fixed bug")
* Keep the first line concise and focused on the change
* Use a blank line to separate the brief summary from the body
* Use bullet points to break up large blocks of text

Example:
```
Fix bug in user registration

* Update user registration endpoint to handle errors correctly
* Add input validation to prevent SQL injection
* Update tests to cover new functionality