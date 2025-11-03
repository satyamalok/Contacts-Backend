# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time contacts synchronization backend for Android sales teams (~50 devices). Built with Node.js, TypeScript, Fastify, PostgreSQL, Redis, and Socket.IO. Features version-based delta sync for bandwidth efficiency, WebSocket real-time updates, and RESTful APIs.

## Development Commands

### Running the Application
```bash
npm run dev          # Development server with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm start            # Run production build from dist/
```

### Database Migrations
```bash
npm run migration:run      # Run all pending SQL migrations
npm run migration:create   # Create a new migration file
```

### Code Quality
```bash
npm run lint         # ESLint for TypeScript
npm run format       # Prettier code formatting
npm test             # Run Jest tests (when implemented)
```

### Docker Operations
```bash
docker-compose up -d              # Start all services (PostgreSQL, Redis, App)
docker-compose logs -f app        # View application logs
docker-compose down               # Stop all services
docker-compose down -v            # Stop and remove volumes (resets DB)
```

## Architecture Overview

### Layered Architecture
The codebase follows a strict layered architecture:

1. **Entry Point** (`src/app.ts`): Fastify server initialization, route registration, WebSocket setup
2. **Controllers** (`src/controllers/`): HTTP request handling, validation, response formatting
3. **Services** (`src/services/`): Business logic, delta sync calculations, data transformations
4. **Models** (`src/models/`): Database queries, data access layer
5. **WebSocket** (`src/websocket/index.ts`): Real-time bidirectional communication via Socket.IO

### Key Components

**Database (`src/config/database.ts`)**:
- Singleton pattern with connection pooling (2-10 connections configurable via .env)
- Transaction support via `db.transaction(callback)`
- All queries use parameterized statements to prevent SQL injection
- Query logging with duration tracking in debug mode

**WebSocket Manager (`src/websocket/index.ts`)**:
- Manages Socket.IO connections with authentication
- Implements room-based broadcasting (`all_agents`, `agent_{code}`)
- Tracks authenticated sockets in `Map<string, AuthenticatedSocket>`
- Events: `auth`, `sync_request`, `contact_create`, `contact_update`, `contact_delete`
- Broadcasts: `contact_created`, `contact_updated`, `contact_deleted`, `sync_complete`

**Authentication Middleware (`src/middleware/auth.ts`)**:
- API key-based authentication via `X-API-Key` header
- Keys validated against `agents` table
- Active status check (`is_active` column)
- Attaches agent info to request object for downstream use

**Logger (`src/utils/logger.ts`)**:
- Winston logger with multiple transports (console, file)
- Log files: `logs/combined.log`, `logs/error.log`
- File rotation: 5MB per file, max 5 files
- Use `logger.info()`, `logger.error()`, `logger.warn()`, `logger.debug()`

### Delta Sync Mechanism

The core innovation is **version-based delta sync**:

1. **Global Version Counter** (`global_version` table): Atomically incremented on every contact change using `get_next_version()` PostgreSQL function
2. **Version Tracking**: Each contact has a `version` column; devices track `last_sync_version`
3. **Delta Query**: `SELECT * FROM contacts WHERE version > $1` returns only changes since last sync
4. **Soft Deletes**: Deleted contacts marked with `is_deleted = true` (not removed) so deletes propagate
5. **Sync Log** (`sync_log` table): Tracks each device's sync status, timestamp, and changes count

**Why version-based over timestamps?**
- No clock skew issues across devices
- Guaranteed ordering of changes
- Single atomic counter (no race conditions)
- Fast indexed integer comparison

### Database Schema Highlights

**Core Tables**:
- `agents`: API keys, agent info, last_seen timestamp
- `contacts`: Contact data with `version` and `is_deleted` columns (indexed on version)
- `sync_log`: Per-device sync tracking
- `audit_log`: Complete change history with JSONB diffs
- `global_version`: Single-row table with current version counter

**Functions**:
- `get_next_version()`: Atomically increments and returns version

**Triggers**:
- `contact_updated_at_trigger`: Auto-updates `updated_at` timestamp
- `contact_audit_trigger`: Logs all changes to `audit_log`

**Views**:
- `active_contacts`: Filters out `is_deleted = true`
- `device_status`: Real-time device connection status
- `sync_statistics`: Aggregated sync metrics

## File Structure Conventions

```
src/
├── config/          # Environment config and database connection
├── controllers/     # HTTP route handlers (ContactController, DeviceController, AuthController)
├── services/        # Business logic (ContactService, DeviceService)
├── models/          # Database queries (ContactModel, AgentModel, SyncLogModel)
├── middleware/      # Fastify middleware (auth.ts)
├── websocket/       # Socket.IO setup and event handlers
├── utils/           # Utilities (logger.ts, helpers.ts)
├── types/           # TypeScript interfaces and types
└── app.ts           # Main entry point

database/
└── migrations/      # Sequential SQL migration files (001_*.sql, 002_*.sql)
```

## Important Implementation Details

### Adding New API Endpoints

Follow this pattern (see existing controllers):

1. **Define types** in `src/types/index.ts` for request/response shapes
2. **Add model methods** in `src/models/` for database operations
3. **Implement business logic** in `src/services/`
4. **Create controller function** in `src/controllers/`
5. **Register route** in `src/app.ts` with `{ preHandler: authenticate }` for protected routes
6. **Add Swagger docs** using Fastify's schema option

### Database Migrations

Migrations are in `database/migrations/` with naming: `001_description.sql`, `002_description.sql`

- Create migration: `npm run migration:create` (edit the generated file)
- Run migrations: `npm run migration:run`
- Migrations tracked in `migrations` table (auto-created)
- Migrations are idempotent - rerunning is safe

### WebSocket Event Broadcasting

To broadcast from REST endpoints (e.g., after creating a contact via API):

```typescript
// In controller, access WebSocket manager:
const wsManager = (request.server as any).wsManager;
wsManager.broadcastToAll('contact_created', { contact, version });
```

### Transaction Usage

For multi-step database operations:

```typescript
await db.transaction(async (client) => {
  await client.query('UPDATE ...', params);
  await client.query('INSERT ...', params);
  // Auto commits on success, rolls back on error
});
```

### Error Handling

- Controllers wrap service calls in try/catch
- Return `{ success: false, error: 'message' }` format
- Log errors with `logger.error()` including context
- Global error handler in `src/app.ts` catches unhandled errors
- Development: Include stack traces; Production: Generic messages

## Environment Configuration

Copy `.env.example` to `.env` and configure:

**Critical variables**:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL connection
- `API_KEY_SALT`: Salt for API key generation (MUST change in production)
- `NODE_ENV`: `development` or `production` (affects logging and error messages)
- `PORT`: Server port (default 3000)
- `CORS_ORIGIN`: CORS policy (`*` for dev, specific domains for production)

**Optional**:
- `REDIS_HOST`, `REDIS_PORT`: Redis for caching/pub-sub (future use)
- `LOG_LEVEL`: Winston log level (`debug`, `info`, `warn`, `error`)
- `DB_POOL_MIN`, `DB_POOL_MAX`: Connection pool size

## Testing and Debugging

### Health Check
```bash
curl http://localhost:3000/health
```

### API Documentation
Visit `http://localhost:3000/docs` (Swagger UI) after starting the server

### Manual Testing
```bash
# Register an agent
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"agent_code":"TEST001","agent_name":"Test Agent"}'

# Use returned API key for subsequent requests
curl http://localhost:3000/api/contacts \
  -H "X-API-Key: sk_xxxxxx"
```

### Database Access
```bash
# Via Docker
docker exec -it contacts-db psql -U postgres -d contacts_db

# Useful queries
SELECT * FROM contacts ORDER BY version DESC LIMIT 10;
SELECT * FROM global_version;
SELECT * FROM device_status;
```

### View Logs
```bash
# Application logs
tail -f logs/combined.log
tail -f logs/error.log

# Docker logs
docker-compose logs -f app
docker-compose logs -f postgres
```

## Common Patterns

### Creating a New Model Method

```typescript
// In src/models/ContactModel.ts
static async findByPhone(phone: string): Promise<Contact | null> {
  const result = await db.query(
    'SELECT * FROM contacts WHERE phone_primary = $1 AND is_deleted = false LIMIT 1',
    [phone]
  );
  return result.rows[0] || null;
}
```

### Implementing a Service Method

```typescript
// In src/services/ContactService.ts
static async searchByPhone(phone: string): Promise<Contact | null> {
  const contact = await ContactModel.findByPhone(phone);
  if (!contact) {
    throw new Error('Contact not found');
  }
  return contact;
}
```

### Adding a Controller Endpoint

```typescript
// In src/controllers/ContactController.ts
static async searchByPhone(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { phone } = request.params as { phone: string };
    const contact = await ContactService.searchByPhone(phone);
    return { success: true, data: contact };
  } catch (error: any) {
    logger.error('Search by phone error:', error);
    return reply.status(404).send({ success: false, error: error.message });
  }
}

// In src/app.ts
fastify.get('/api/contacts/phone/:phone', { preHandler: authenticate }, ContactController.searchByPhone);
```

## Performance Considerations

- **Indexes**: `version` column is heavily indexed for delta sync queries
- **Connection Pooling**: Configured via `DB_POOL_MIN`/`DB_POOL_MAX` (default 2-10)
- **Query Optimization**: Use `EXPLAIN ANALYZE` for slow queries
- **WebSocket Rooms**: Minimize broadcasts to specific rooms instead of `all_agents` when possible
- **Pagination**: Implemented on `/api/contacts` (default 50 per page)
- **Soft Deletes**: Prefer `is_deleted = true` over `DELETE` to maintain sync history

## Security Notes

- All database queries use parameterized statements (via pg's `$1, $2` syntax)
- API keys generated with nanoid (cryptographically secure)
- CORS configured per environment
- Input validation on all request bodies
- No sensitive data in logs (passwords, full API keys)
- WebSocket authentication required before any operations

## Troubleshooting

**Database connection errors**: Check PostgreSQL is running (`docker-compose ps`), verify credentials in `.env`

**Migration errors**: Check `database/migrations/` for syntax errors, view `migrations` table for execution status

**WebSocket not connecting**: Verify CORS settings, check firewall/port 3000 accessibility, confirm API key validity

**Version conflicts**: Global version is atomic; conflicts shouldn't occur, but check `audit_log` for change history
