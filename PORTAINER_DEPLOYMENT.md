# Portainer Stack Deployment Guide

Deploy Contacts Sync Backend using Portainer Stack with direct GitHub integration.

## Prerequisites

- ✅ Portainer installed and running (port 9000) - Already done
- ✅ Nginx Proxy Manager installed - Already done
- ✅ Domain ready: `contacts.tsblive.in`

## Port Assignment

Based on your current containers, this deployment will use:
- **Port 3000** for the Contacts Backend (not conflicting with any existing services)

After deployment, you'll access via Nginx Proxy Manager at: `https://contacts.tsblive.in`

## Step-by-Step Deployment

### Step 1: Access Portainer

1. Open Portainer: `http://your-vps-ip:9000`
2. Login with your credentials
3. Click on your environment (local)
4. Go to **Stacks** in the left menu

### Step 2: Create New Stack

1. Click **+ Add stack** button
2. Name the stack: `contacts-sync-backend`

### Step 3: Copy the Docker Compose Configuration

In the **Web editor**, paste this complete docker-compose configuration:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
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

  # Redis Cache
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

  # Contacts Backend Application
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

### Step 4: Deploy the Stack

1. Scroll down
2. Click **Deploy the stack** button
3. Wait for the build and deployment process (this will take 3-5 minutes as it builds from GitHub)

**Note:** The first deployment will take longer because Docker needs to:
- Clone the GitHub repository
- Install Node.js dependencies
- Build TypeScript to JavaScript
- Create the Docker image

### Step 5: Monitor Deployment

1. Go to **Containers** in Portainer
2. You should see three new containers:
   - `contacts-sync-app` (Building... then Running)
   - `contacts-sync-db` (Running - healthy)
   - `contacts-sync-redis` (Running - healthy)

3. Click on `contacts-sync-app` to view logs
4. Wait until you see: `Server listening on http://0.0.0.0:3000`

### Step 6: Verify Deployment

Test the API from your VPS:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":...}
```

If you get a healthy response, the deployment is successful! ✅

### Step 7: Configure Nginx Proxy Manager

1. Open Nginx Proxy Manager: `http://your-vps-ip:81`
2. Go to **Hosts** → **Proxy Hosts**
3. Click **Add Proxy Host**

**Details Tab:**
- **Domain Names:** `contacts.tsblive.in`
- **Scheme:** `http`
- **Forward Hostname / IP:** `contacts-sync-app` (or `localhost`)
- **Forward Port:** `3000`
- ✅ **Block Common Exploits**
- ✅ **Websockets Support** (IMPORTANT for Socket.IO!)

**SSL Tab:**
- ✅ **SSL Certificate:** Request a new SSL certificate with Let's Encrypt
- **Email:** your-email@example.com
- ✅ **Force SSL**
- ✅ **HTTP/2 Support**
- ✅ **HSTS Enabled**

Click **Save**

### Step 8: Access Your Application

After Nginx Proxy Manager is configured:

1. **Web Dashboard:** `https://contacts.tsblive.in`
2. **API Documentation:** `https://contacts.tsblive.in/docs`
3. **Health Check:** `https://contacts.tsblive.in/health`

### Step 9: Create Your First Agent

Run this from your VPS or local machine:

```bash
curl -X POST https://contacts.tsblive.in/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_code": "ADMIN",
    "agent_name": "Administrator"
  }'
```

**Save the API key returned!** You'll need it to login to the web dashboard.

### Step 10: Update Environment for Production (Optional)

After verifying everything works, you can update the stack with production settings:

1. Go to **Stacks** → `contacts-sync-backend`
2. Click **Editor**
3. Update these values in the `app` service environment:

```yaml
CORS_ORIGIN: "https://contacts.tsblive.in"
FRONTEND_URL: "https://contacts.tsblive.in"
API_KEY_SALT: "your-new-random-salt-here"  # Generate a random string
```

4. Click **Update the stack**

## Troubleshooting

### Build Failed

**Check logs:**
```bash
docker logs contacts-sync-app
```

**Common issues:**
- GitHub repository not accessible
- Docker build timeout
- Node.js dependencies failed to install

**Solution:** Rebuild the stack in Portainer

### Database Connection Error

**Check database:**
```bash
docker exec contacts-sync-db psql -U postgres -d contacts_db -c "SELECT 1"
```

**Check if database is running:**
```bash
docker ps | grep contacts-sync-db
```

### Migration Failed

**Run migrations manually:**
```bash
docker exec -it contacts-sync-app sh
cd /app
node -r tsx/cjs database/migrations/run.ts
```

### Cannot Access from External URL

**Check Nginx Proxy Manager:**
1. Verify proxy host is configured correctly
2. Check SSL certificate is valid
3. Ensure WebSocket support is enabled

**Check firewall:**
```bash
ufw status
# Ports 80 and 443 should be allowed (already configured for NPM)
```

### WebSocket Not Working

**Ensure in Nginx Proxy Manager:**
- ✅ Websockets Support is enabled
- Forward to correct container and port
- SSL is configured properly

### Container Keeps Restarting

**Check logs:**
```bash
docker logs contacts-sync-app --tail 100
```

**Common causes:**
- Database not ready (wait a bit longer)
- Migration errors
- Port already in use
- Environment variable issues

## Stack Management

### View Logs

**Via Portainer:**
1. Go to **Containers**
2. Click on container name
3. Click **Logs** tab

**Via Command Line:**
```bash
# All services
docker-compose -f /path/to/stack/docker-compose.yml logs -f

# Specific service
docker logs contacts-sync-app -f
```

### Restart Stack

**Via Portainer:**
1. Go to **Stacks** → `contacts-sync-backend`
2. Click **Stop** then **Start**

**Via Command Line:**
```bash
docker restart contacts-sync-app contacts-sync-db contacts-sync-redis
```

### Update Stack (New Code from GitHub)

**Via Portainer:**
1. Go to **Stacks** → `contacts-sync-backend`
2. Click **Editor**
3. Click **Update the stack** (with "Re-pull image and redeploy" checked)

This will:
- Pull latest code from GitHub
- Rebuild the image
- Redeploy containers

### Backup Database

```bash
docker exec contacts-sync-db pg_dump -U postgres contacts_db > contacts_backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
docker exec -i contacts-sync-db psql -U postgres contacts_db < contacts_backup_20240101.sql
```

### Remove Stack

**Via Portainer:**
1. Go to **Stacks** → `contacts-sync-backend`
2. Click **Delete this stack**
3. ✅ **Remove associated volumes** (WARNING: This deletes all data!)

## Security Recommendations

Before going to production:

1. **Change Database Password:**
   - Edit stack, change `DB_PASSWORD`
   - Update the stack

2. **Change API Key Salt:**
   - Edit stack, change `API_KEY_SALT` to a random string
   - Update the stack
   - This affects how API keys are generated

3. **Restrict CORS:**
   - Change `CORS_ORIGIN` from `*` to `https://contacts.tsblive.in`

4. **Add Redis Password (Optional):**
   - Edit stack, add Redis password
   - Update both Redis and App services

5. **Regular Backups:**
   - Set up automated database backups
   - Store backups off-server

## Default Credentials

### Database
- **Host:** postgres (internal) or localhost:5432 (not exposed externally)
- **Database:** contacts_db
- **User:** postgres
- **Password:** ContactsDB#2024!SecurePass

### Redis
- **Host:** redis (internal)
- **Port:** 6379
- **Password:** (none - optional for internal use)

### Application
- **Port:** 3000
- **API Keys:** Generated via `/api/auth/register` endpoint

## Next Steps

1. ✅ Stack deployed
2. ✅ Nginx Proxy Manager configured
3. ✅ SSL certificate obtained
4. ✅ First agent registered
5. → Access web dashboard at `https://contacts.tsblive.in`
6. → Integrate with Android app using `docs/ANDROID_API.md`
7. → Set up regular backups
8. → Monitor via container logs

## Support

- **GitHub Issues:** https://github.com/satyamalok/Contacts-Backend/issues
- **Documentation:** See README.md and docs/ folder
- **API Docs:** https://contacts.tsblive.in/docs
- **Health Check:** https://contacts.tsblive.in/health

---

**Your Contacts Sync Backend is now live! 🚀**
