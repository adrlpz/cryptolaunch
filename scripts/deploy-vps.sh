#!/bin/bash
# ============================================================
# CryptoLaunch — VPS Deployment Script
# ============================================================
# Run on VPS: bash scripts/deploy-vps.sh
#
# Prerequisites:
#   - Ubuntu 22.04+ with root/sudo access
#   - Domain pointed to VPS IP (optional)
# ============================================================

set -e

echo "========================================"
echo "  CryptoLaunch — VPS Deployment"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================================
# 1. Install Docker if not present
# ============================================================
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed. You may need to log out and back in.${NC}"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    sudo apt-get install -y docker-compose-plugin
fi

# ============================================================
# 2. Check .env.production exists
# ============================================================
if [ ! -f .env.production ]; then
    echo -e "${RED}.env.production not found!${NC}"
    echo "Run: bash scripts/generate-secrets.sh > .env.production"
    echo "Then edit .env.production to add SEPOLIA_RPC_URL"
    exit 1
fi

# ============================================================
# 3. Generate Prisma migration
# ============================================================
echo -e "${YELLOW}Generating Prisma client...${NC}"
docker compose run --rm app npx prisma generate 2>/dev/null || true

# ============================================================
# 4. Build and start services
# ============================================================
echo -e "${YELLOW}Building Docker images...${NC}"
docker compose build

echo -e "${YELLOW}Starting services...${NC}"
docker compose up -d

# ============================================================
# 5. Wait for healthy services
# ============================================================
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check app health
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}App is healthy!${NC}"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

# ============================================================
# 6. Get public IP
# ============================================================
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "YOUR_VPS_IP")

# ============================================================
# Summary
# ============================================================
echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE"
echo "========================================"
echo -e "App URL:     ${GREEN}http://${PUBLIC_IP}:3000${NC}"
echo -e "Database:    ${GREEN}PostgreSQL (Docker)${NC}"
echo -e "Network:     ${GREEN}Sepolia Testnet${NC}"
echo -e "Factory:     ${GREEN}0x28A1CBC275A6BB0b59b90B2B3142dca321c96B8B${NC}"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f app    # View app logs"
echo "  docker compose logs -f db     # View DB logs"
echo "  docker compose restart app    # Restart app"
echo "  docker compose down           # Stop all"
echo "  docker compose up -d          # Start all"
echo ""
echo "To update .env.production:"
echo "  nano .env.production"
echo "  docker compose restart app"
echo "========================================"
