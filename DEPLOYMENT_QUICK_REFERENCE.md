# 🚀 Quick Deployment Reference

## Copy-Paste Docker Compose for Portainer

**Stack Name:** `contacts-sync-backend`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: contacts-sync-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: contacts_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ContactsDB#2024!SecurePass
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - contacts_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - contacts-network

  redis:
    image: redis:7-alpine
    container_name: contacts-sync-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - contacts_redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - contacts-network

  app:
    build:
      context: https://github.com/satyamalok/Contacts-Backend.git
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    image: contacts-sync-backend:latest
    container_name: contacts-sync-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      HOST: 0.0.0.0
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: contacts_db
      DB_USER: postgres
      DB_PASSWORD: ContactsDB#2024!SecurePass
      DB_POOL_MIN: 2
      DB_POOL_MAX: 10
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ""
      API_KEY_SALT: test_salt_change_in_production_k8h3j9f2n4m7q1w5
      LOG_LEVEL: info
      CORS_ORIGIN: "*"
      WS_PING_INTERVAL: 25000
      WS_PING_TIMEOUT: 60000
      FRONTEND_URL: http://localhost:3000
    ports:
      - "3000:3000"
    volumes:
      - contacts_logs:/app/logs
    networks:
      - contacts-network
    command: sh -c "echo 'Waiting for database...' && sleep 5 && echo 'Running migrations...' && node -r tsx/cjs database/migrations/run.ts && echo 'Starting server...' && node dist/app.js"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  contacts_postgres_data:
    driver: local
  contacts_redis_data:
    driver: local
  contacts_logs:
    driver: local

networks:
  contacts-network:
    driver: bridge
```

---

## Nginx Proxy Manager Configuration

### Proxy Host Settings

**Details Tab:**
- Domain: `contacts.tsblive.in`
- Scheme: `http`
- Forward Hostname/IP: `contacts-sync-app` (or `localhost`)
- Forward Port: `3000`
- ✅ Block Common Exploits
- ✅ **Websockets Support** ← IMPORTANT!

**SSL Tab:**
- ✅ Request new SSL Certificate (Let's Encrypt)
- Email: your-email@example.com
- ✅ Force SSL
- ✅ HTTP/2 Support
- ✅ HSTS Enabled

---

## Quick Commands

### Register First Agent
```bash
curl -X POST https://contacts.tsblive.in/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"agent_code": "ADMIN", "agent_name": "Administrator"}'
```

### Test Health
```bash
curl https://contacts.tsblive.in/health
```

### View Logs
```bash
docker logs contacts-sync-app -f
```

### Backup Database
```bash
docker exec contacts-sync-db pg_dump -U postgres contacts_db > backup.sql
```

### Restart Stack
```bash
docker restart contacts-sync-app contacts-sync-db contacts-sync-redis
```

---

## Access Points

| Service | URL |
|---------|-----|
| Web Dashboard | https://contacts.tsblive.in |
| API Docs | https://contacts.tsblive.in/docs |
| Health Check | https://contacts.tsblive.in/health |
| Portainer | http://your-vps-ip:9000 |
| Nginx Proxy Manager | http://your-vps-ip:81 |

---

## Default Credentials

### Database
- Host: `postgres` (internal)
- Database: `contacts_db`
- User: `postgres`
- Password: `ContactsDB#2024!SecurePass`

### Application
- Port: `3000`
- API Keys: Generated via `/api/auth/register`

---

## Deployment Steps (3 minutes)

1. **Open Portainer** → Stacks → Add Stack
2. **Name:** `contacts-sync-backend`
3. **Paste** the Docker Compose above
4. **Deploy** (wait 3-5 minutes for build)
5. **Configure Nginx Proxy Manager** (see settings above)
6. **Register Agent** (use curl command above)
7. **Access Dashboard** at https://contacts.tsblive.in

---

## Troubleshooting

### Build taking too long?
Wait 5 minutes. First build downloads dependencies.

### Cannot access?
- Check container logs: `docker logs contacts-sync-app`
- Verify Nginx Proxy Manager settings
- Ensure WebSocket support is enabled in NPM

### Database error?
- Check database is running: `docker ps | grep contacts-sync-db`
- Verify password matches in compose file

### WebSocket not working?
- **Enable WebSocket Support in Nginx Proxy Manager!**
- Check SSL is configured
- Verify proxy forwards to correct port

---

## Production Changes (Before Going Live)

Update these in the Stack Editor:

```yaml
API_KEY_SALT: "generate_random_32_char_string_here"
CORS_ORIGIN: "https://contacts.tsblive.in"
DB_PASSWORD: "YourStrongPasswordHere"
```

Then click **Update the stack**

---

## Android Integration

Give `docs/ANDROID_API.md` to your Android developer with these details:

- **Base URL:** `https://contacts.tsblive.in`
- **WebSocket URL:** `wss://contacts.tsblive.in`
- **API Key:** (from registration)
- **Agent Code:** (from registration)

---

## Key Features

✅ Real-time sync via WebSocket
✅ Delta sync (bandwidth efficient)
✅ Offline support
✅ Device monitoring
✅ Bulk import/export
✅ Audit logging
✅ API documentation

---

**Need help?** See `PORTAINER_DEPLOYMENT.md` for detailed instructions.
