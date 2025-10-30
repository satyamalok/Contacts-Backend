# Installation Guide

Complete step-by-step installation instructions for Contacts Sync Backend.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Installation](#docker-installation)
4. [VPS Deployment](#vps-deployment)
5. [Post-Installation](#post-installation)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### For Local Development
- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 15+ ([Download](https://www.postgresql.org/download/))
- Redis 7+ ([Download](https://redis.io/download))
- Git ([Download](https://git-scm.com/))

### For Docker Deployment
- Docker 20+ ([Install](https://docs.docker.com/get-docker/))
- Docker Compose 2+ ([Install](https://docs.docker.com/compose/install/))
- Git

### For VPS Deployment
- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- At least 2GB RAM
- 20GB disk space
- Open ports: 80, 443, 3000 (or your chosen port)

---

## Local Development Setup

### Step 1: Install Dependencies

#### On Windows:
1. Install Node.js from https://nodejs.org/
2. Install PostgreSQL from https://www.postgresql.org/download/windows/
3. Install Redis from https://github.com/microsoftarchive/redis/releases

#### On macOS:
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node postgresql redis
brew services start postgresql
brew services start redis
```

#### On Linux (Ubuntu/Debian):
```bash
# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Redis
sudo apt-get install -y redis-server

# Start services
sudo systemctl start postgresql
sudo systemctl start redis
```

### Step 2: Clone Repository

```bash
git clone https://github.com/your-username/contacts-backend.git
cd contacts-backend
```

### Step 3: Install Node Modules

```bash
npm install
```

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:
```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=5432
DB_NAME=contacts_db
DB_USER=postgres
DB_PASSWORD=your_password_here

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

API_KEY_SALT=change_this_to_random_string

LOG_LEVEL=debug
CORS_ORIGIN=*
```

### Step 5: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database (in psql console)
CREATE DATABASE contacts_db;
\q
```

### Step 6: Run Migrations

```bash
npm run migration:run
```

### Step 7: Start Development Server

```bash
npm run dev
```

Server should start at `http://localhost:3000`

---

## Docker Installation

### Step 1: Install Docker

#### On Windows/Mac:
Download and install Docker Desktop from https://www.docker.com/products/docker-desktop

#### On Linux:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
```

### Step 2: Clone Repository

```bash
git clone https://github.com/your-username/contacts-backend.git
cd contacts-backend
```

### Step 3: Configure Environment

```bash
cp .env.example .env
nano .env  # or use any text editor
```

Update these minimum values:
```env
NODE_ENV=production
DB_PASSWORD=strong_password_here
API_KEY_SALT=random_salt_string_here
```

### Step 4: Start Services

```bash
docker-compose up -d
```

This will:
- Build the application image
- Start PostgreSQL container
- Start Redis container
- Start the application container
- Run database migrations automatically

### Step 5: Check Status

```bash
docker-compose ps
docker-compose logs -f app
```

---

## VPS Deployment

### Step 1: Prepare VPS

Connect to your VPS via SSH:
```bash
ssh root@your-vps-ip
```

Update system:
```bash
apt update && apt upgrade -y
```

Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

Install Docker Compose:
```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Step 2: Clone Repository

```bash
cd /opt
git clone https://github.com/your-username/contacts-backend.git
cd contacts-backend
```

### Step 3: Configure Environment

```bash
cp .env.example .env
nano .env
```

Production settings:
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

DB_HOST=postgres
DB_PORT=5432
DB_NAME=contacts_db
DB_USER=postgres
DB_PASSWORD=STRONG_PASSWORD_HERE

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

API_KEY_SALT=RANDOM_SALT_HERE

LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
```

### Step 4: Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

### Step 5: Configure Firewall

```bash
# Allow SSH
ufw allow 22

# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Allow application port
ufw allow 3000

# Enable firewall
ufw enable
```

### Step 6: Set up Nginx (Optional but Recommended)

Install Nginx:
```bash
apt install -y nginx
```

Create configuration:
```bash
nano /etc/nginx/sites-available/contacts
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/contacts /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 7: Set up SSL with Let's Encrypt

Install Certbot:
```bash
apt install -y certbot python3-certbot-nginx
```

Get certificate:
```bash
certbot --nginx -d your-domain.com
```

Auto-renewal is set up automatically.

---

## Post-Installation

### Create First Agent

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_code": "ADMIN",
    "agent_name": "Administrator"
  }'
```

**Important:** Save the API key returned!

### Access Web Dashboard

Open browser: `http://your-server-ip:3000` or `https://your-domain.com`

Login with the API key from above.

### View API Documentation

Open: `http://your-server-ip:3000/docs` or `https://your-domain.com/docs`

---

## Verification

### 1. Check Health

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...
}
```

### 2. Run API Tests

```bash
chmod +x test-api.sh
./test-api.sh
```

### 3. Check Container Logs

```bash
docker-compose logs -f app
```

### 4. Check Database Connection

```bash
docker-compose exec postgres psql -U postgres -d contacts_db -c "SELECT COUNT(*) FROM contacts;"
```

### 5. Check Redis Connection

```bash
docker-compose exec redis redis-cli ping
```

---

## Troubleshooting

### Issue: Port 3000 Already in Use

**Solution:** Change port in `.env`:
```env
PORT=3001
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Issue: Database Connection Failed

**Check PostgreSQL is running:**
```bash
docker-compose ps postgres
docker-compose logs postgres
```

**Restart database:**
```bash
docker-compose restart postgres
```

**Verify credentials in `.env` match docker-compose.yml**

### Issue: Migration Failed

**Manual migration:**
```bash
docker-compose exec app npm run migration:run
```

**Or connect to database and run manually:**
```bash
docker-compose exec postgres psql -U postgres -d contacts_db
# Then run SQL from database/migrations/001_initial_schema.sql
```

### Issue: Cannot Access from External Network

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 3000
```

**Check Docker port binding:**
```bash
docker-compose ps
# Should show 0.0.0.0:3000->3000/tcp
```

**Check Nginx configuration:**
```bash
nginx -t
systemctl status nginx
```

### Issue: WebSocket Connection Failed

**Check Socket.IO is accessible:**
```bash
curl http://localhost:3000/socket.io/
```

**Verify CORS settings in `.env`**

**Check Nginx WebSocket proxy (if using Nginx)**

### Issue: High Memory Usage

**Check container stats:**
```bash
docker stats
```

**Restart containers:**
```bash
docker-compose restart
```

**Check for memory leaks in logs:**
```bash
docker-compose logs app | grep -i memory
```

### Issue: Database Disk Full

**Check disk space:**
```bash
df -h
```

**Clean old Docker data:**
```bash
docker system prune -a
```

**Check database size:**
```bash
docker-compose exec postgres psql -U postgres -d contacts_db -c "SELECT pg_size_pretty(pg_database_size('contacts_db'));"
```

---

## Updating

### Pull Latest Changes

```bash
cd /opt/contacts-backend
git pull origin main
```

### Rebuild and Restart

```bash
docker-compose down
docker-compose up -d --build
```

### Run New Migrations (if any)

```bash
docker-compose exec app npm run migration:run
```

---

## Backup

### Database Backup

```bash
docker exec contacts-db pg_dump -U postgres contacts_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Automated Backup Script

Create `/opt/backup-contacts.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/contacts"
mkdir -p $BACKUP_DIR
FILENAME="contacts_$(date +%Y%m%d_%H%M%S).sql"
docker exec contacts-db pg_dump -U postgres contacts_db > $BACKUP_DIR/$FILENAME
find $BACKUP_DIR -type f -mtime +7 -delete  # Keep only last 7 days
```

Make executable:
```bash
chmod +x /opt/backup-contacts.sh
```

Add to crontab (daily at 2 AM):
```bash
crontab -e
# Add line:
0 2 * * * /opt/backup-contacts.sh
```

---

## Uninstall

### Remove Docker Containers

```bash
cd /opt/contacts-backend
docker-compose down -v  # WARNING: Deletes all data!
```

### Remove Files

```bash
rm -rf /opt/contacts-backend
```

### Remove Nginx Configuration

```bash
rm /etc/nginx/sites-enabled/contacts
rm /etc/nginx/sites-available/contacts
systemctl restart nginx
```

---

## Next Steps

1. ✅ Server installed and running
2. ✅ API key generated
3. ✅ Web dashboard accessible
4. → Read [Android Integration Guide](docs/ANDROID_API.md)
5. → Integrate with your Android app
6. → Set up monitoring and alerts
7. → Configure regular backups

---

For more information:
- **Quick Start**: See QUICKSTART.md
- **Full Documentation**: See README.md
- **API Reference**: Visit /docs endpoint
- **Architecture**: See docs/ARCHITECTURE.md
