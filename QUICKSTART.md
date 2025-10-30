# Quick Start Guide

Get your Contacts Sync Backend up and running in 5 minutes.

## Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for production deployment)
- Git

## Option 1: Local Development (Quick Test)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd contacts-backend
npm install
```

### 2. Set up Environment

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_NAME=contacts_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Set up Database

Create PostgreSQL database:
```bash
createdb contacts_db
```

Run migrations:
```bash
npm run migration:run
```

### 4. Start Development Server

```bash
npm run dev
```

Server starts at: http://localhost:3000

## Option 2: Docker Deployment (Recommended)

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd contacts-backend
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env  # Edit with your settings
```

Minimum required changes:
```env
DB_PASSWORD=your_secure_password_here
API_KEY_SALT=your_random_salt_here
```

### 3. Deploy

```bash
docker-compose up -d
```

That's it! The application is now running.

### 4. Verify Deployment

Check health:
```bash
curl http://localhost:3000/health
```

View logs:
```bash
docker-compose logs -f app
```

## First Steps

### 1. Register Your First Agent

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_code": "AGENT001",
    "agent_name": "Test Agent"
  }'
```

Save the returned `api_key` - you'll need it for all API requests.

### 2. Access Web Dashboard

Open http://localhost:3000 in your browser and login with your API key.

### 3. View API Documentation

Open http://localhost:3000/docs for interactive API documentation.

## Next Steps

1. **Configure Your Android App**
   - Read the [Android Integration Guide](docs/ANDROID_API.md)
   - Use the API key from step 1
   - Configure WebSocket connection

2. **Add More Agents**
   - Register additional agents for each device/user
   - Each agent gets a unique API key

3. **Test Real-time Sync**
   - Add a contact via API or web dashboard
   - Connect your Android app
   - Verify real-time updates

## Common Issues

### Database Connection Error

**Problem:** Can't connect to PostgreSQL

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port Already in Use

**Problem:** Port 3000 is already in use

**Solution:** Change the port in `.env`:
```env
PORT=3001
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Migration Failed

**Problem:** Database migrations won't run

**Solution:**
```bash
# Connect to database container
docker exec -it contacts-db psql -U postgres -d contacts_db

# Check if migrations table exists
\dt migrations

# If needed, manually run migration
\i database/migrations/001_initial_schema.sql
```

## Production Deployment on VPS

### 1. Prepare VPS

Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

Install Docker Compose:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone and Deploy

```bash
git clone <your-repo-url>
cd contacts-backend
cp .env.example .env
nano .env  # Edit with production settings
chmod +x deploy.sh
./deploy.sh
```

### 3. Set up Domain (Optional)

Install Nginx:
```bash
sudo apt install nginx
```

Create Nginx config at `/etc/nginx/sites-available/contacts`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/contacts /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Set up SSL (Optional)

Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring

### View Live Logs

```bash
docker-compose logs -f app
```

### Check Container Status

```bash
docker-compose ps
```

### Monitor Resources

```bash
docker stats
```

### Database Backup

```bash
docker exec contacts-db pg_dump -U postgres contacts_db > backup_$(date +%Y%m%d).sql
```

### Database Restore

```bash
docker exec -i contacts-db psql -U postgres contacts_db < backup_20240101.sql
```

## Useful Commands

### Restart Application

```bash
docker-compose restart app
```

### View All Logs

```bash
docker-compose logs
```

### Rebuild After Code Changes

```bash
git pull
docker-compose up -d --build
```

### Stop Everything

```bash
docker-compose down
```

### Stop and Remove All Data

```bash
docker-compose down -v  # WARNING: This deletes all data!
```

### Execute Command in Container

```bash
docker-compose exec app sh
```

### Connect to Database

```bash
docker-compose exec postgres psql -U postgres -d contacts_db
```

## Getting Help

- **Documentation**: README.md
- **API Reference**: /docs endpoint
- **Android Guide**: docs/ANDROID_API.md
- **GitHub Issues**: <your-repo-url>/issues

## Security Checklist

Before going to production:

- [ ] Change `DB_PASSWORD` to a strong password
- [ ] Change `API_KEY_SALT` to a random string
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall (only allow ports 80, 443, 22)
- [ ] Set up SSL/TLS certificates
- [ ] Enable regular backups
- [ ] Review and restrict `CORS_ORIGIN`
- [ ] Set up monitoring and alerts
- [ ] Document your API keys securely

## Architecture Overview

```
┌─────────────────┐
│  Android Devices │
│   (50 devices)   │
└────────┬─────────┘
         │
         │ REST API + WebSocket
         │
    ┌────▼─────────────────┐
    │  Contacts Backend    │
    │   (Node.js/Fastify)  │
    │   - REST APIs        │
    │   - WebSocket        │
    │   - Delta Sync       │
    └────┬─────────────────┘
         │
    ┌────▼───────┐  ┌──────────┐
    │ PostgreSQL │  │  Redis   │
    │  Database  │  │  Cache   │
    └────────────┘  └──────────┘
```

## Performance Tips

1. **Database Indexing**: Already optimized in schema
2. **Connection Pooling**: Configured in `config/database.ts`
3. **Redis Caching**: Use Redis for frequently accessed data
4. **Pagination**: Always use pagination for large datasets
5. **Delta Sync**: Use version-based sync instead of full sync

## What's Next?

1. Integrate with your Android application
2. Configure multiple agents for your sales team
3. Set up automated backups
4. Monitor device sync status via dashboard
5. Customize and extend the API as needed

---

**Need help?** Check the full documentation in README.md or open an issue on GitHub.
