# Architecture Documentation

## System Overview

Contacts Sync Backend is a real-time contact synchronization system designed to keep contact data in sync across ~50 Android devices used by a sales team. The system uses a combination of RESTful APIs and WebSocket connections to provide both on-demand and real-time synchronization.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        Android Devices                          │
│                    (Sales Team - ~50 devices)                   │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             │ REST API                       │ WebSocket (Socket.IO)
             │ (CRUD, Sync)                   │ (Real-time updates)
             │                                │
┌────────────▼────────────────────────────────▼───────────────────┐
│                     Contacts Sync Backend                        │
│                   (Node.js + TypeScript + Fastify)               │
│                                                                  │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ REST API     │  │ WebSocket   │  │ Authentication       │  │
│  │ Layer        │  │ Layer       │  │ (API Key)            │  │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬───────────┘  │
│         │                 │                     │               │
│  ┌──────▼─────────────────▼─────────────────────▼───────────┐  │
│  │                  Business Logic Layer                     │  │
│  │  - ContactService  - DeviceService  - SyncService        │  │
│  └──────┬──────────────────────────────────────────────────┘  │
│         │                                                       │
│  ┌──────▼──────────────────────────────────────────────────┐  │
│  │               Data Access Layer (Models)                 │  │
│  │  - ContactModel  - AgentModel  - SyncLogModel           │  │
│  └──────┬──────────────────────────────────────────────────┘  │
└─────────┼──────────────────────────────────────────────────────┘
          │
  ┌───────▼────────┐          ┌─────────────┐
  │  PostgreSQL    │          │   Redis     │
  │  Database      │          │   Cache     │
  │  - Contacts    │          │   (Pub/Sub) │
  │  - Agents      │          │             │
  │  - Sync Logs   │          │             │
  │  - Audit Logs  │          │             │
  └────────────────┘          └─────────────┘
```

## Core Components

### 1. API Layer

#### REST API (Fastify)
- **Purpose**: Handle CRUD operations, bulk operations, and delta sync
- **Technology**: Fastify (high-performance web framework)
- **Features**:
  - Request validation
  - Error handling
  - API documentation (Swagger/OpenAPI)
  - CORS support

#### WebSocket (Socket.IO)
- **Purpose**: Real-time bidirectional communication
- **Technology**: Socket.IO
- **Features**:
  - Automatic reconnection
  - Room-based broadcasting
  - Event-driven architecture
  - Fallback mechanisms

### 2. Business Logic Layer

#### ContactService
- Contact CRUD operations
- Delta sync calculation
- Bulk import/export
- Search and filtering

#### DeviceService
- Device status monitoring
- Sync tracking
- Health metrics
- Outdated device detection

#### SyncService
- Version-based sync
- Change tracking
- Conflict resolution
- Offline queue management

### 3. Data Access Layer

#### Models
- **ContactModel**: Contact data operations
- **AgentModel**: Agent/device authentication
- **SyncLogModel**: Sync status tracking
- **AuditLogModel**: Change history

#### Database Connection
- Connection pooling
- Transaction support
- Query optimization
- Health monitoring

### 4. Authentication

- **Method**: API Key authentication
- **Storage**: Database (agents table)
- **Security**:
  - Secure key generation (nanoid)
  - One-way hash verification
  - Per-agent isolation

### 5. WebSocket Manager

- Connection management
- Authentication handling
- Event broadcasting
- Room management
- Device tracking

## Database Schema

### Core Tables

#### agents
```sql
- id: UUID (PK)
- agent_code: VARCHAR (Unique)
- agent_name: VARCHAR
- api_key: VARCHAR (Unique)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- last_seen: TIMESTAMP
```

#### contacts
```sql
- id: UUID (PK)
- first_name: VARCHAR
- last_name: VARCHAR
- phone_primary: VARCHAR
- phone_secondary: VARCHAR
- created_by_agent: VARCHAR (FK)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- version: BIGINT (Indexed)
- is_deleted: BOOLEAN
```

#### sync_log
```sql
- id: UUID (PK)
- device_id: VARCHAR
- agent_code: VARCHAR (FK)
- last_sync_version: BIGINT
- last_sync_at: TIMESTAMP
- sync_status: VARCHAR
- changes_count: INTEGER
```

#### audit_log
```sql
- id: UUID (PK)
- contact_id: UUID (FK)
- agent_code: VARCHAR (FK)
- action: VARCHAR (CREATE/UPDATE/DELETE)
- changes: JSONB
- version: BIGINT
- timestamp: TIMESTAMP
```

#### global_version
```sql
- id: INTEGER (PK) - Always 1
- current_version: BIGINT
- updated_at: TIMESTAMP
```

### Database Functions

#### get_next_version()
- Atomically increments and returns the global version
- Used for every contact change
- Ensures version consistency

### Database Triggers

#### contact_updated_at_trigger
- Automatically updates `updated_at` on contact changes

#### contact_audit_trigger
- Logs all contact changes to audit_log
- Captures before/after state

### Database Views

#### active_contacts
- Filters out deleted contacts

#### device_status
- Real-time device connection and sync status

#### sync_statistics
- Aggregated sync metrics

## Delta Sync Mechanism

### Version-Based Sync Strategy

```
1. Global Version Counter
   ├─ Incremented on every change (CREATE/UPDATE/DELETE)
   ├─ Atomic operation (no race conditions)
   └─ Single source of truth

2. Device Tracking
   ├─ Each device stores last_sync_version locally
   ├─ Server tracks device sync status
   └─ Identifies outdated devices

3. Delta Calculation
   ├─ Query: SELECT * FROM contacts WHERE version > last_sync_version
   ├─ Returns only changed records
   └─ Includes deletions (is_deleted flag)

4. Sync Process
   ├─ Device requests: GET /api/sync/delta?version={last_known}
   ├─ Server responds with changes since that version
   ├─ Device applies changes locally
   └─ Device updates its last_known_version
```

### Advantages

- **Bandwidth Efficient**: Only changed data is transmitted (~90% reduction)
- **Fast**: Simple query, indexed on version field
- **Scalable**: Works efficiently with large datasets
- **Reliable**: No data loss, complete sync history
- **Simple**: Easy to implement and debug

## Real-Time Sync Flow

### Initial Connection

```
1. Device connects to WebSocket
2. Device sends authentication (API key + agent_code + device_id)
3. Server validates credentials
4. Server registers device in connection pool
5. Device joins agent-specific room
6. Device receives authentication confirmation
```

### Real-Time Updates

```
When Agent A creates a contact:

1. Agent A → POST /api/contacts
2. Server creates contact with new version
3. Server broadcasts to all connected devices:
   - Event: "contact_created"
   - Payload: { contact, version, created_by }
4. All devices (except Agent A) receive update
5. Devices update local database
6. Devices update UI
```

### Offline/Online Handling

```
When device goes offline:
1. Device queues operations locally
2. Operations stored in local SQLite/Room

When device comes back online:
1. Device reconnects to WebSocket
2. Device authenticates
3. Device uploads queued operations
4. Device requests delta sync with last_known_version
5. Device receives all missed changes
6. Device applies changes
7. Device clears queue
8. Device resumes real-time listening
```

## Scalability Considerations

### Current Capacity

- **Concurrent Connections**: 50 WebSocket connections
- **Request Throughput**: ~1000 req/sec
- **Database**: 100k+ contacts with sub-second queries
- **Version Counter**: Supports 9,223,372,036,854,775,807 changes

### Scaling Strategies

#### Horizontal Scaling
- Add load balancer (Nginx/HAProxy)
- Deploy multiple backend instances
- Use Redis for session sharing
- Sticky sessions for WebSocket

#### Database Scaling
- Read replicas for queries
- Master-slave replication
- Connection pooling (already implemented)
- Query optimization with indexes (already implemented)

#### Caching Layer
- Redis for frequently accessed data
- Contact list caching
- Device status caching
- Version caching

#### CDN & Static Assets
- Serve frontend from CDN
- Cache API responses (where appropriate)

## Security

### Authentication
- API key-based authentication
- Keys generated with cryptographic random (nanoid)
- Keys stored securely in database
- Per-agent isolation

### Input Validation
- Request body validation
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- Phone number format validation

### Rate Limiting
- Can be added with fastify-rate-limit
- Recommended: 100 requests/minute per API key

### CORS
- Configurable via environment variable
- Production: Restrict to known domains
- Development: Allow all origins

### SSL/TLS
- HTTPS recommended for production
- WebSocket Secure (WSS) for encrypted communication
- Let's Encrypt for free SSL certificates

## Error Handling

### HTTP Error Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (inactive agent)
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed description (dev only)"
}
```

### Logging
- Winston logger with multiple transports
- Log levels: error, warn, info, debug
- File rotation (5MB per file, 5 files)
- Structured logging (JSON format)

## Monitoring & Observability

### Health Checks
- `/health` endpoint
- Database connection test
- Returns service status and uptime

### Metrics (Recommended)
- Request count per endpoint
- Response times
- Error rates
- Active connections
- Database query times

### Logging
- Application logs (logs/combined.log)
- Error logs (logs/error.log)
- Access logs (via Fastify)
- Database query logs (debug mode)

### Alerts (Recommended)
- Database connection failures
- High error rates
- Slow queries
- Outdated devices (>100 versions behind)
- Disk space low

## Performance Optimizations

### Database
- Indexed queries on version, agent_code, phone numbers
- Connection pooling (2-10 connections)
- Prepared statements
- VACUUM and ANALYZE scheduled

### API
- Response compression
- Pagination for large datasets
- Efficient JSON serialization
- Query result caching (where applicable)

### WebSocket
- Ping/pong for connection health
- Automatic reconnection
- Binary protocol (when possible)
- Message compression

### Frontend
- Static asset caching
- Lazy loading
- Debounced search
- Optimistic UI updates

## Deployment Architecture

### Development
```
localhost:3000 (Node.js)
localhost:5432 (PostgreSQL)
localhost:6379 (Redis)
```

### Production (Docker)
```
Docker Network
├─ contacts-backend (Node.js)
├─ contacts-db (PostgreSQL)
└─ contacts-redis (Redis)

Exposed Ports:
- 3000 (API + WebSocket)
```

### Production (with Nginx)
```
Internet → Nginx (80/443)
           ├─ Static files
           └─ Proxy → contacts-backend (3000)
                      ├─ REST API
                      └─ WebSocket
```

## Testing Strategy

### Unit Tests
- Model methods
- Utility functions
- Business logic

### Integration Tests
- API endpoints
- WebSocket events
- Database operations

### End-to-End Tests
- Full sync flow
- Authentication
- CRUD operations

### Load Tests
- Concurrent connections
- Request throughput
- Database performance

## Future Enhancements

### Short-term
- [ ] React-based web dashboard (currently simple HTML)
- [ ] Contact photos support
- [ ] Contact groups/tags
- [ ] Advanced search filters

### Medium-term
- [ ] User roles and permissions
- [ ] Multi-tenant support
- [ ] Email/SMS integration
- [ ] Data export scheduling

### Long-term
- [ ] Machine learning for duplicate detection
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)
- [ ] GraphQL API

## Design Decisions

### Why Fastify over Express?
- **Performance**: 2-3x faster than Express
- **TypeScript**: First-class TypeScript support
- **Modern**: Built for async/await
- **Plugin System**: Better modularity

### Why PostgreSQL over MongoDB?
- **ACID Compliance**: Critical for contact data
- **Complex Queries**: Better JOIN support
- **Transactions**: Atomic version increments
- **Reliability**: Proven track record

### Why Socket.IO over Raw WebSocket?
- **Reliability**: Automatic reconnection
- **Fallbacks**: Long-polling fallback
- **Rooms**: Easy broadcast management
- **Ecosystem**: Large community and tooling

### Why Version-Based over Timestamp-Based Sync?
- **Accuracy**: No clock skew issues
- **Ordering**: Guaranteed change order
- **Simplicity**: Single incrementing counter
- **Performance**: Indexed integer comparison

## Troubleshooting Guide

### High CPU Usage
- Check database query performance
- Review WebSocket connection count
- Analyze application logs

### High Memory Usage
- Check for connection leaks
- Review Redis memory usage
- Analyze garbage collection

### Slow Queries
- Use EXPLAIN ANALYZE
- Check index usage
- Review query patterns

### WebSocket Disconnections
- Check network stability
- Review ping/pong intervals
- Analyze connection logs

---

For implementation details, see the source code with inline documentation.
