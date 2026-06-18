#!/bin/bash
# ============================================================
# Generate production secrets for CryptoLaunch
# ============================================================

echo "# Generated secrets — copy to .env.production"
echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "DB_PASSWORD=$(openssl rand -hex 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
