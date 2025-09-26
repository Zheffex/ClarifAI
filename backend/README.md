# ClarifAI Backend

Express.js API server written in TypeScript for the ClarifAI platform. Provides REST APIs, real-time features with Socket.IO, and MongoDB persistence via Mongoose.

Badges:
- Node.js (LTS recommended)
- TypeScript 5
- Express 5
- MongoDB

## Overview
This repository contains a TypeScript-based Node.js backend with the following key components:
- Express 5 HTTP API server.
- MongoDB (via Mongoose) for data persistence.
- Authentication, RBAC, validation middleware, and error handling.
- Socket.IO for real-time capabilities.
- Optional Redis integration (URL configurable).
- Logging via Winston.
- Configuration via environment variables (dotenv).
- Testing with Jest, ts-jest, Supertest, and mongodb-memory-server.

## Tech Stack
- Language: TypeScript
- Runtime: Node.js (CommonJS output; tsconfig outDir dist)
- Frameworks/Libraries: Express 5, Mongoose, Socket.IO, CORS, Helmet, express-rate-limit, express-validator, Multer, Winston, dotenv
- Optional services: Redis (ioredis/redis), OpenRouter AI API integration
- Tests: Jest + ts-jest + Supertest + mongodb-memory-server
- Package Manager: npm

## Project Structure
This reflects the actual code in src/:

- src/
  - config/
    - environment.ts (env loading/validation)
    - logger.ts (Winston logger)
    - database.ts (MongoDB connection) [present per imports]
  - controllers/ (request handlers) [present]
  - middleware/
    - auth.ts, rbac.ts, errorHandler.ts [present]
    - advancedRateLimit.ts [present]
  - models/ (Mongoose schemas) [present]
  - routes/
    - auth.ts, datasets.ts, analytics.ts, collaboration.ts, ai.ts, dashboard.ts, notifications.ts, securityRoutes.ts [present]
  - services/
    - socketService.ts, openRouterService.ts, ... [present]
  - index.ts (application entry point)
- dist/ (compiled JS)
- tests/ (Jest tests and setup)

TODO: Add a generated tree if needed for documentation.

## Entry Points
- Development entry: src/index.ts (run with ts-node via nodemon).
- Production entry: dist/index.js (compiled from TypeScript).

## Requirements
- Node.js LTS (>=18 recommended)
- npm
- MongoDB instance for running the app (not required for tests due to in-memory DB)

## Setup
1) Install dependencies
- npm install

2) Configure environment variables
- Create a .env file at the project root. See the Environment Variables section below for required and optional variables.
- You can validate your configuration with: npm run validate-env

3) Build (for production)
- npm run build

## Running
- Development (watch mode with nodemon):
  - npm run dev
- Production (after build):
  - npm start

By default, the server listens on PORT from env (default 5000 via environment.ts). Health check: GET /health.

CORS origin is controlled by FRONTEND_URL.

## npm Scripts
From package.json:
- build: tsc
- start: node dist/index.js
- dev: nodemon src/index.ts
- test: jest
- test:watch: jest --watch
- test:coverage: jest --coverage
- validate-env: node validate-env.js
- setup: npm install && npm run validate-env

## Environment Variables
Required (validated at startup in src/config/environment.ts):
- MONGODB_URI: MongoDB connection string (mongodb:// or mongodb+srv://)
- JWT_SECRET: secret used for JWT signing
- OPENROUTER_API_KEY: API key for OpenRouter (AI features). If not set, AI features are disabled; validation script will warn.

Optional (with defaults shown where applicable):
- PORT (number, default 5000)
- NODE_ENV (default development)
- JWT_EXPIRES_IN (default 24h)
- FRONTEND_URL (default http://localhost:3000)
- MAX_FILE_SIZE (bytes, default 52428800 = 50MB)
- UPLOAD_PATH (default ./uploads)
- LOG_LEVEL (default info)
- OPENROUTER_MODEL (default x-ai/grok-4-fast:free)
- SITE_URL (default http://localhost:3000)
- SITE_NAME (default ClarifAI)
- EMAIL_HOST (optional)
- EMAIL_PORT (number, default 587)
- EMAIL_USER (optional)
- EMAIL_PASS (optional)
- EMAIL_FROM (default "ClarifAI <noreply@clarifai.com>")
- EMAIL_SECURE (boolean, default false)
- WEB_PUSH_PUBLIC_KEY (optional)
- WEB_PUSH_PRIVATE_KEY (optional)
- WEB_PUSH_CONTACT (optional)
- ENCRYPTION_MASTER_KEY (optional)
- ENCRYPTION_KEY_ID (default default)
- REDIS_URL (default redis://localhost:6379)
- RATE_LIMIT_WINDOW_MS (default 900000)
- RATE_LIMIT_MAX_REQUESTS (default 100)

Example .env:

NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/clarifai
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_MODEL=x-ai/grok-4-fast:free
SITE_URL=http://localhost:3000
SITE_NAME=ClarifAI
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads
REDIS_URL=redis://localhost:6379

## API Routes
Mounted in src/index.ts:
- /api/auth
- /api/datasets
- /api/analytics
- /api/collaboration
- /api/ai
- /api/dashboard
- /api/notifications
- /api/security

TODO: Add detailed API documentation (endpoints, request/response schemas) or link to an OpenAPI/Postman collection. See POSTMAN_API_COMMANDS.md for examples if applicable.

## Logging
- Winston logger writes to console and files: logs/error.log and logs/combined.log. Log level auto-adjusts by NODE_ENV (debug in development, warn in production).

## Real-time (Socket.IO)
- Socket.IO server is initialized alongside the HTTP server with CORS aligned to FRONTEND_URL. A global socketService is initialized for use in other modules.

## Testing
- Test runner: Jest (ts-jest preset)
- Files: tests/**/*.test.ts (plus __tests__ patterns)
- Setup file: tests/setup.ts loads .env.test (if present) and sets reasonable defaults
- Database: mongodb-memory-server spins up an ephemeral MongoDB; no external DB needed for tests
- Run tests: npm test
- Watch: npm run test:watch
- Coverage: npm run test:coverage (outputs to coverage/)

Note: Jest config excludes src/index.ts from coverage.

## Development Notes
- Rate limiting is more lenient in development; stricter in production.
- Validate your environment with npm run validate-env. This script will warn about weak JWT secrets and missing AI keys.

## Project Status
This README reflects the current repository state based on source files and package.json. If parts are missing or differ from your local setup, please update accordingly.

TODOs:
- Document deployment (Dockerfile/CI/CD) if/when available.
- Provide API reference (OpenAPI/Swagger) or link to Postman collection.
- Add .env.example file to the repo for easier onboarding.

## License
This project is licensed under the ISC License (see package.json).








