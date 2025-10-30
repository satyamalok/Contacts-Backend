#!/bin/bash

# Contacts Sync Backend - Automated VPS Installation
# This script will install the entire stack on your VPS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "================================================"
echo "  Contacts Sync Backend - VPS Installation"
echo "================================================"
echo -e "${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Install Docker first: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Step 2: Create installation directory
echo -e "${YELLOW}[2/6] Creating installation directory...${NC}"
INSTALL_DIR="/opt/contacts-sync-backend"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
echo -e "${GREEN}✓ Directory created: $INSTALL_DIR${NC}"
echo ""

# Step 3: Create docker-compose.yml
echo -e "${YELLOW}[3/6] Creating docker-compose.yml...${NC}"
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

echo -e "${GREEN}✓ docker-compose.yml created${NC}"
echo ""

# Step 4: Pull images and build
echo -e "${YELLOW}[4/6] Building application (this will take 3-5 minutes)...${NC}"
echo -e "${BLUE}Cloning from GitHub and building...${NC}"
docker-compose build --no-cache

echo -e "${GREEN}✓ Application built successfully${NC}"
echo ""

# Step 5: Start services
echo -e "${YELLOW}[5/6] Starting services...${NC}"
docker-compose up -d

echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 6: Wait for services to be ready
echo -e "${YELLOW}[6/6] Waiting for services to be ready...${NC}"
sleep 10

# Check if containers are running
echo "Checking container status..."
docker-compose ps

echo ""
echo -e "${BLUE}Testing health endpoint...${NC}"
sleep 5

if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy!${NC}"
else
    echo -e "${YELLOW}⚠ Health check pending... Application may still be starting up${NC}"
    echo "Check logs with: docker logs contacts-sync-app -f"
fi

# Final instructions
echo ""
echo -e "${GREEN}"
echo "================================================"
echo "  Installation Complete!"
echo "================================================"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Installation Directory:${NC} $INSTALL_DIR"
echo -e "${BLUE}Local Access:${NC} http://localhost:3000"
echo -e "${BLUE}API Documentation:${NC} http://localhost:3000/docs"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Configure Nginx Proxy Manager:"
echo "   - Domain: contacts.tsblive.in"
echo "   - Forward to: contacts-sync-app:3000 (or localhost:3000)"
echo "   - ✅ Enable WebSocket Support!"
echo "   - Request SSL certificate"
echo ""
echo "2. Create your first agent:"
echo "   curl -X POST http://localhost:3000/api/auth/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"agent_code\": \"ADMIN\", \"agent_name\": \"Administrator\"}'"
echo ""
echo "3. Save the API key that is returned!"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs:      docker logs contacts-sync-app -f"
echo "  Restart:        docker-compose restart"
echo "  Stop:           docker-compose stop"
echo "  Start:          docker-compose start"
echo "  Rebuild:        docker-compose up -d --build"
echo "  Remove all:     docker-compose down -v  (WARNING: deletes data)"
echo ""
echo -e "${GREEN}Installation completed successfully! 🚀${NC}"
echo ""
