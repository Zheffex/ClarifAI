# ClarifAI Backend – Developer Guide

Audience: Backend developers onboarding to the ClarifAI platform.

This guide explains how the backend works, how to run and test it locally, conventions to follow, and how to add new features safely.


## 1. Architecture Overview

- Runtime: Node.js (LTS; >=18 recommended)
- Language: TypeScript
- Web framework: Express 5
- Database: MongoDB via Mongoose
- Real-time: Socket.IO (attached to the HTTP server)
- Auth: JWT-based authentication + RBAC middleware
- Validation: express-validator and custom middlewares
- Security: Helmet, CORS, rate limiting, input validation, error handling
- Logging: Winston (console + rotating files)
- Config: environment variables (dotenv) loaded/validated in `src/config/environment.ts`
- Optional integrations: Redis, OpenRouter AI API
- Testing: Jest + ts-jest + Supertest + mongodb-memory-server

Request lifecycle (typical):
1) HTTP request hits Express route under `/api/*`.
2) Middleware runs (security headers, CORS, rate limit, auth/validation as needed).
3) Controller executes business logic, calls services and/or Mongoose models.
4) Responses are standardized (errors bubble to centralized error handler).
5) Real-time events may be emitted via `socketService` when needed.


## 2. Repository Structure

- src/
  - config/
    - environment.ts: Loads and validates env variables; provides typed config.
    - logger.ts: Winston logger configuration.
    - database.ts: MongoDB connection setup.
  - controllers/: Route handlers mapping requests to business logic.
  - middleware/: Auth, RBAC, validation, error handler, rate limiting, etc.
  - models/: Mongoose schemas and models.
  - routes/: Express routers mounting controllers and middleware.
  - services/: Business logic not tied to Express (e.g., socketService, openRouterService).
  - index.ts: App entry; sets up Express, routes, Socket.IO, error handling, server listen.
- dist/: Compiled JS for production.
- tests/: Jest tests (unit/integration) with in-memory Mongo.

Tip: Use this guide together with README.md for commands and environment details.


## 3. Getting Started

Prerequisites:
- Node.js LTS (>=18)
- npm
- MongoDB running locally, unless you rely on in-memory DB in tests
- Redis optional if enabling related features

Steps:
1) Install deps: `npm install`
2) Copy `.env.example` to `.env` and adjust values.
3) Validate env: `npm run validate-env`
4) Start dev server (watch): `npm run dev`
5) Health check: `GET http://localhost:5000/health` (default port; see PORT in env)

Build and run production:
- Build: `npm run build`
- Start: `npm start`


## 4. Environment & Configuration

Environment variables are defined and validated in `src/config/environment.ts`. Key ones:
- Required: `MONGODB_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY` (AI features optional but warned if missing)
- Common: `PORT`, `NODE_ENV`, `FRONTEND_URL`, `LOG_LEVEL`, `REDIS_URL`
- See README “Environment Variables” for full list.

Use `npm run validate-env` to catch misconfiguration early. In tests, `mongodb-memory-server` is used, so `MONGODB_URI` is not required.


## 5. Development Conventions

- TypeScript: prefer explicit types in public boundaries (controllers/services), rely on inference inside functions.
- Linting/formatting: If ESLint/Prettier configs are added, follow them; otherwise keep a consistent style (2-spaces or configured editor defaults).
- Error handling: Throw custom errors or use `next(err)`; let the centralized `errorHandler` middleware format responses.
- Logging: Use the shared Winston logger from `src/config/logger.ts`. Avoid `console.log` in production code.
- Validation: Use `express-validator` or dedicated validators; fail fast and return `400` with details.
- Security: Mind RBAC and auth middleware; never trust client input; consider rate limits on sensitive routes.
- Git hygiene: Small, focused commits with descriptive messages; prefer conventional commit style if possible (e.g., feat:, fix:, docs:).


## 6. Adding a New Feature

Example: Add a new resource “reports”.

1) Model
   - Create `src/models/report.ts` with a Mongoose schema and indexes.
   - Validate data at schema level where appropriate (required fields, enums, min/max).

2) Controller
   - Create `src/controllers/reportController.ts` with CRUD functions.
   - Keep controllers thin; push business logic into `src/services/reportService.ts` if it grows.

3) Routes
   - Create `src/routes/reports.ts` and wire endpoints to controller methods.
   - Apply middleware: auth, RBAC, validation, rate limit as needed.

4) Mount route
   - In `src/index.ts`, mount at `/api/reports`.

5) Tests
   - Add tests in `tests/reports.test.ts` using Supertest and in-memory Mongo.
   - Cover happy paths and edge cases (auth failures, validation errors).

6) Real-time (optional)
   - If clients should receive updates, use `socketService.emit(event, payload)` appropriately.

7) Docs
   - Update README or API docs (OpenAPI/Postman) for the new endpoints.


## 7. Socket.IO Usage

- The Socket.IO server is initialized alongside Express with CORS derived from `FRONTEND_URL`.
- Use the shared `socketService` from `src/services/socketService.ts` to emit events.
- Namespaces/rooms: introduce them if you need scoped broadcasting (e.g., by tenant, dataset, or user).
- Authentication: Ensure only authorized users can subscribe to sensitive events; reuse JWT validation logic.


## 8. Data Access Patterns

- Prefer repository/service functions over ad-hoc queries in controllers.
- Ensure indexes for frequent queries; set them in Mongoose schema.
- Handle pagination with `limit` + `skip` (or cursor-based) and return metadata.
- Soft deletes vs hard deletes: be explicit and consistent.
- Transactions: Use Mongo sessions for multi-document consistency when required.


## 9. Error Handling & Response Shape

- Central error middleware (`middleware/errorHandler.ts`) formats responses; include `message`, `code`, and `details` where useful.
- Use HTTP status codes consistently: 2xx success, 4xx client errors, 5xx server errors.
- Don’t leak internal error details in production. Log full details, return sanitized messages to clients.


## 10. Security Checklist

- Use `helmet` and CORS properly configured (origin via `FRONTEND_URL`).
- Rate limit sensitive endpoints (`advancedRateLimit.ts`).
- Validate and sanitize all inputs.
- Use strong `JWT_SECRET`; rotate if compromised.
- Avoid logging secrets or PII. Redact where appropriate.
- RBAC: enforce role checks in routes touching privileged resources.
- Encrypt or hash sensitive data at rest where needed. Review `ENCRYPTION_MASTER_KEY` usage before storing secrets.


## 11. Testing

- Run all tests: `npm test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage` (outputs to `coverage/`)
- Unit tests: target services and utils.
- Integration tests: use Supertest to hit Express routes; DB is ephemeral via mongodb-memory-server.
- Tests should be deterministic; avoid relying on time or external APIs. Mock OpenRouter/Redis when needed.


## 12. Logging & Observability

- Use logger from `src/config/logger.ts` with levels: error, warn, info, http, verbose, debug, silly.
- In production, logs write to files under `logs/` in addition to console.
- Include correlation IDs if you plan to trace requests across services.


## 13. Performance Tips

- Index your Mongo collections for frequent query patterns.
- Use projection to avoid fetching large documents unnecessarily.
- Batch writes where possible; avoid chatty loops.
- Cache hot reads in Redis if enabled; set TTLs thoughtfully.
- Stream large file uploads/downloads; honor `MAX_FILE_SIZE` and `UPLOAD_PATH`.


## 14. Deployment Notes

- Build artifacts are in `dist/`. Start with `node dist/index.js`.
- Ensure environment variables are set in your deployment environment.
- Configure logs persistence and rotation in production.
- CORS `FRONTEND_URL` and `SITE_URL` must match your deployed frontend domain.
- Consider Dockerizing and adding CI/CD; see README TODOs.


## 15. Troubleshooting

- App won’t start:
  - Run `npm run validate-env` and check required envs.
  - Verify MongoDB is reachable and `MONGODB_URI` is correct.
- CORS errors:
  - Ensure `FRONTEND_URL` matches your client origin exactly, including protocol and port.
- JWT errors:
  - Check `JWT_SECRET` strength and expiry settings.
- Socket not connecting:
  - Verify server CORS matches frontend; inspect network tab for 4xx/5xx on websocket upgrades.
- Tests failing locally but not in CI (or vice versa):
  - Ensure no reliance on local Mongo; tests use in-memory DB by default.


## 16. Useful Commands

- Install deps: `npm install`
- Validate env: `npm run validate-env`
- Dev server: `npm run dev`
- Build: `npm run build`
- Start prod: `npm start`
- Run tests: `npm test`
- Watch tests: `npm run test:watch`
- Coverage: `npm run test:coverage`


## 17. API Documentation

- High-level routes are listed in README under “API Routes”.
- For request/response schemas and examples, use or generate an OpenAPI spec or refer to `POSTMAN_API_COMMANDS.md` if available.
- Consider adding Swagger UI in dev-only builds for quick discovery.


## 18. Contributing

- Branching: feature branches off `main` (or active development branch), PRs with review.
- Code review: request at least one reviewer; ensure tests cover new logic.
- CI: Ensure all tests pass and coverage doesn’t regress.
- Changelog/release notes: summarize user-facing changes.


## 19. References

- README.md (runtime details and env vars)
- POSTMAN_API_COMMANDS.md (API usage examples)
- SECURITY_FEATURES.md (overview of security-related components)
