#!/bin/bash

# Contacts Sync Backend - Deployment Script
# This script automates the deployment process on VPS

set -e  # Exit on error

echo "================================================"
echo "Contacts Sync Backend - Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: Not running as root. Some commands may require sudo.${NC}"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Install Docker: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    echo "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env file with your production settings before continuing.${NC}"
        read -p "Press Enter to continue after editing .env file..."
    else
        echo -e "${RED}Error: .env.example file not found${NC}"
        exit 1
    fi
fi

echo "Configuration loaded from .env"
echo ""

# Pull latest changes (if git repository)
if [ -d .git ]; then
    echo "Pulling latest changes from git..."
    git pull origin main || git pull origin master
    echo -e "${GREEN}✓ Code updated${NC}"
    echo ""
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

# Build and start containers
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for services to be healthy
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check container status
echo ""
echo "Container status:"
docker-compose ps

# Check application health
echo ""
echo "Checking application health..."
sleep 5

if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy!${NC}"
else
    echo -e "${RED}✗ Application health check failed${NC}"
    echo "Check logs with: docker-compose logs app"
fi

# Display logs
echo ""
echo "Recent logs:"
docker-compose logs --tail=50 app

echo ""
echo "================================================"
echo -e "${GREEN}Deployment completed!${NC}"
echo "================================================"
echo ""
echo "Access points:"
echo "  - Web Dashboard: http://your-server-ip:3000"
echo "  - API Documentation: http://your-server-ip:3000/docs"
echo "  - Health Check: http://your-server-ip:3000/health"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f app"
echo "  - Restart: docker-compose restart"
echo "  - Stop: docker-compose down"
echo "  - Rebuild: docker-compose up -d --build"
echo ""
