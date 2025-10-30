# 🚀 START HERE - Complete Deployment Guide

## What You Have

A complete, production-ready **Contacts Sync Backend** for your Android sales team (50 devices).

## Your Deployment Plan

### Phase 1: Push to GitHub (2 minutes)

#### Option A: Quick Push (If you have GitHub CLI)
```bash
cd "C:\Users\satya\Documents\Contacts Backend\Contacts-Backend"
gh auth login
git add .
git commit -m "Add complete contacts sync backend"
git push origin main
```

#### Option B: Manual Push
```bash
cd "C:\Users\satya\Documents\Contacts Backend\Contacts-Backend"
git add .
git commit -m "Add complete contacts sync backend"
git push origin main
# Enter your GitHub username and Personal Access Token when prompted
```

**Verify:** Visit https://github.com/satyamalok/Contacts-Backend to see your code

---

### Phase 2: Deploy with Portainer Stack (5 minutes)

#### Step 1: Open Portainer
- URL: `http://your-vps-ip:9000`
- Login with your credentials

#### Step 2: Create Stack
1. Click **Stacks** in left menu
2. Click **+ Add stack**
3. Name: `contacts-sync-backend`

#### Step 3: Paste Docker Compose

Copy this ENTIRE configuration into the Web editor:

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

#### Step 4: Deploy
1. Click **Deploy the stack**
2. Wait 3-5 minutes for GitHub clone + build
3. Monitor in **Containers** section

#### Step 5: Verify Deployment
From your VPS terminal:
```bash
curl http://localhost:3000/health
# Should return: {"status":"healthy",...}
```

✅ If healthy response → Deployment successful!

---

### Phase 3: Configure Nginx Proxy Manager (3 minutes)

#### Step 1: Open NPM
- URL: `http://your-vps-ip:81`
- Login with your credentials

#### Step 2: Add Proxy Host
Click **Hosts** → **Proxy Hosts** → **Add Proxy Host**

**Details Tab:**
```
Domain Names: contacts.tsblive.in
Scheme: http
Forward Hostname/IP: contacts-sync-app
Forward Port: 3000
☑ Block Common Exploits
☑ Websockets Support ← CRITICAL! Don't forget this!
```

**SSL Tab:**
```
☑ SSL Certificate: Request a New SSL Certificate
Email: your-email@example.com
☑ I Agree to Let's Encrypt Terms
☑ Force SSL
☑ HTTP/2 Support
☑ HSTS Enabled
```

#### Step 3: Save
Click **Save** and wait for SSL certificate generation

---

### Phase 4: Create First Agent (1 minute)

From your VPS or local terminal:

```bash
curl -X POST https://contacts.tsblive.in/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_code": "ADMIN",
    "agent_name": "Administrator"
  }'
```

**IMPORTANT:** Copy and save the `api_key` from the response!

---

### Phase 5: Access Dashboard

1. Open browser: `https://contacts.tsblive.in`
2. Login with the API key from Step 4
3. Explore the dashboard:
   - **Contacts tab:** Manage contacts
   - **Devices tab:** Monitor devices
   - **Stats tab:** View statistics

---

## 🎉 You're Done!

Your backend is now:
- ✅ Running on your VPS
- ✅ Accessible at https://contacts.tsblive.in
- ✅ Secured with SSL/TLS
- ✅ Ready for Android integration

---

## Next Steps

### 1. Test the System

Try these:
- Add a contact via web dashboard
- View API documentation: https://contacts.tsblive.in/docs
- Check health: https://contacts.tsblive.in/health

### 2. Integrate Android App

Give your Android developer:
- **File:** `docs/ANDROID_API.md` (complete integration guide)
- **Base URL:** `https://contacts.tsblive.in`
- **WebSocket URL:** `wss://contacts.tsblive.in`
- **API Key:** (from Phase 4)
- **Agent Code:** `ADMIN` (or create more agents)

### 3. Create More Agents (for each device/user)

```bash
curl -X POST https://contacts.tsblive.in/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_code": "AGENT001",
    "agent_name": "Sales Agent 1"
  }'
```

Repeat for AGENT002, AGENT003, etc.

### 4. Update Production Settings (Optional)

In Portainer → Stacks → contacts-sync-backend → Editor:

Change these values:
```yaml
API_KEY_SALT: "your-random-32-char-string-here"
CORS_ORIGIN: "https://contacts.tsblive.in"
FRONTEND_URL: "https://contacts.tsblive.in"
```

Click **Update the stack**

### 5. Set Up Backups

Create backup script:
```bash
#!/bin/bash
docker exec contacts-sync-db pg_dump -U postgres contacts_db > /backups/contacts_$(date +%Y%m%d).sql
```

Add to crontab (daily at 2 AM):
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

---

## Quick Reference

### Access Points
| What | URL |
|------|-----|
| Web Dashboard | https://contacts.tsblive.in |
| API Docs | https://contacts.tsblive.in/docs |
| Health Check | https://contacts.tsblive.in/health |

### Credentials
- **DB Password:** `ContactsDB#2024!SecurePass`
- **API Key:** (generated per agent)

### Useful Commands
```bash
# View logs
docker logs contacts-sync-app -f

# Restart
docker restart contacts-sync-app

# Backup database
docker exec contacts-sync-db pg_dump -U postgres contacts_db > backup.sql

# Check containers
docker ps | grep contacts
```

---

## Troubleshooting

### Cannot Access Dashboard
- Check NPM proxy host is configured
- Verify SSL certificate is valid
- Ensure WebSocket support is enabled

### Database Error
```bash
docker logs contacts-sync-db
docker restart contacts-sync-db
```

### Build Failed in Portainer
- Check GitHub repository is public/accessible
- Wait 5 minutes (initial build takes time)
- Check container logs

### WebSocket Not Working
- **Enable WebSocket Support in Nginx Proxy Manager!**
- This is the most common issue

---

## Documentation Files

All documentation is in your project folder:

- **README.md** - Complete documentation
- **QUICKSTART.md** - 5-minute quick start
- **INSTALLATION.md** - Detailed installation
- **PORTAINER_DEPLOYMENT.md** - Portainer guide (detailed)
- **DEPLOYMENT_QUICK_REFERENCE.md** - Quick reference card
- **docs/ANDROID_API.md** - Android integration guide
- **docs/ARCHITECTURE.md** - System architecture

---

## Support

- **GitHub:** https://github.com/satyamalok/Contacts-Backend
- **API Docs:** https://contacts.tsblive.in/docs
- **Health Check:** https://contacts.tsblive.in/health

---

## Summary

✅ Backend deployed
✅ Domain configured
✅ SSL secured
✅ API documented
✅ Ready for Android integration

**Total Time: ~15 minutes** ⏱️

---

# 🎯 Your Action Items

1. [ ] Push code to GitHub
2. [ ] Deploy Portainer stack
3. [ ] Configure Nginx Proxy Manager (enable WebSocket!)
4. [ ] Create first agent
5. [ ] Access web dashboard
6. [ ] Give `docs/ANDROID_API.md` to Android developer

---

**Need Help?** See `PORTAINER_DEPLOYMENT.md` for detailed step-by-step instructions.
