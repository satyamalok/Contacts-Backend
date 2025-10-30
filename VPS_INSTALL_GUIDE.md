# VPS Installation Guide - Copy & Paste Method

## Option 1: Automatic Installation (Recommended) ⚡

Just copy and paste these commands into your VPS terminal!

### Step 1: SSH into Your VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Run This Single Command
```bash
curl -fsSL https://raw.githubusercontent.com/satyamalok/Contacts-Backend/main/install-on-vps.sh | bash
```

**That's it!** The script will automatically:
- ✅ Check prerequisites
- ✅ Create installation directory
- ✅ Clone from GitHub
- ✅ Build the application
- ✅ Start all services
- ✅ Run database migrations

Takes about 5-10 minutes.

---

## Option 2: Manual Installation (Step by Step) 📝

If you prefer to see each step:

### Step 1: SSH into VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Create Installation Directory
```bash
mkdir -p /opt/contacts-sync-backend
cd /opt/contacts-sync-backend
```

### Step 3: Create docker-compose.yml
```bash
cat > docker-compose.yml << 'EOF'
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
EOF
```

### Step 4: Build and Start
```bash
docker-compose build
docker-compose up -d
```

### Step 5: Check Status
```bash
docker-compose ps
docker logs contacts-sync-app -f
```

### Step 6: Test
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"healthy",...}`

---

## After Installation

### Configure Nginx Proxy Manager

1. Open NPM: `http://your-vps-ip:81`
2. Add Proxy Host:
   - **Domain:** contacts.tsblive.in
   - **Forward to:** localhost:3000
   - **✅ Enable WebSocket Support**
   - Request SSL certificate

### Create First Agent
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"agent_code": "ADMIN", "agent_name": "Administrator"}'
```

**Save the API key!**

### Access Your Application
- **Local:** http://localhost:3000
- **Domain:** https://contacts.tsblive.in (after NPM setup)
- **API Docs:** https://contacts.tsblive.in/docs

---

## Troubleshooting

### Check if containers are running
```bash
docker ps | grep contacts
```

### View logs
```bash
docker logs contacts-sync-app -f
docker logs contacts-sync-db
```

### Restart services
```bash
docker-compose restart
```

### Rebuild from GitHub
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Remove everything (fresh start)
```bash
docker-compose down -v  # WARNING: Deletes all data!
rm -rf /opt/contacts-sync-backend
# Then start over
```

---

## Quick Commands

### Management
```bash
cd /opt/contacts-sync-backend

# View all containers
docker-compose ps

# Start services
docker-compose start

# Stop services
docker-compose stop

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Update from GitHub
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Monitoring
```bash
# Check health
curl http://localhost:3000/health

# View app logs
docker logs contacts-sync-app --tail 100

# Check resource usage
docker stats contacts-sync-app
```

### Database
```bash
# Backup
docker exec contacts-sync-db pg_dump -U postgres contacts_db > backup.sql

# Restore
docker exec -i contacts-sync-db psql -U postgres contacts_db < backup.sql

# Connect to database
docker exec -it contacts-sync-db psql -U postgres -d contacts_db
```

---

## What Gets Installed

- **contacts-sync-app** - Main application (port 3000)
- **contacts-sync-db** - PostgreSQL database
- **contacts-sync-redis** - Redis cache
- **3 volumes** - Data persistence
- **1 network** - Internal communication

---

## Security Notes

**Change these for production:**
1. Database password: Edit `POSTGRES_PASSWORD` and `DB_PASSWORD` in docker-compose.yml
2. API key salt: Edit `API_KEY_SALT`
3. CORS origin: Change `CORS_ORIGIN` from `*` to your domain

After editing, run:
```bash
docker-compose down
docker-compose up -d
```

---

## Next Steps

1. ✅ Install on VPS (you just did this!)
2. → Configure Nginx Proxy Manager
3. → Create agent and get API key
4. → Access web dashboard
5. → Give `docs/ANDROID_API.md` to Android developer

---

**Installation Location:** `/opt/contacts-sync-backend`

**Need help?** Check logs with: `docker logs contacts-sync-app -f`
