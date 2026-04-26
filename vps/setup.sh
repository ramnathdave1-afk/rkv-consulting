#!/bin/bash
set -e

# ============================================================
# RKV Consulting - Outreach VPS Setup Script
# Sets up Docker, PostgreSQL, n8n, Nginx, and SSL on a fresh
# Ubuntu VPS (tested on Ubuntu 22.04/24.04).
# ============================================================

PROJECT_DIR="/opt/outreach"

echo "==========================================="
echo "  RKV Consulting - VPS Setup"
echo "==========================================="

# ----------------------------------------------------------
# Step 1: Update system packages
# ----------------------------------------------------------
echo "[1/9] Updating system packages..."
apt update && apt upgrade -y

# ----------------------------------------------------------
# Step 2: Install Docker
# ----------------------------------------------------------
echo "[2/9] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "  Docker already installed, skipping."
fi

# ----------------------------------------------------------
# Step 3: Install Docker Compose plugin
# ----------------------------------------------------------
echo "[3/9] Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
else
    echo "  Docker Compose already installed, skipping."
fi

# ----------------------------------------------------------
# Step 4: Create project directory and copy files
# ----------------------------------------------------------
echo "[4/9] Setting up project directory at ${PROJECT_DIR}..."
mkdir -p "${PROJECT_DIR}"
cp docker-compose.yml "${PROJECT_DIR}/"
cp nginx.conf "${PROJECT_DIR}/"
if [ -f init.sql ]; then
    cp init.sql "${PROJECT_DIR}/"
else
    echo "  Warning: init.sql not found in current directory. Copy it manually later."
    touch "${PROJECT_DIR}/init.sql"
fi

# ----------------------------------------------------------
# Step 5: Load environment variables
# ----------------------------------------------------------
echo "[5/9] Configuring environment variables..."
if [ -f .env ]; then
    echo "  Loading from .env file..."
    cp .env "${PROJECT_DIR}/.env"
else
    echo "  No .env file found. Creating one interactively..."

    read -p "Domain name (e.g. n8n.yourdomain.com): " DOMAIN
    read -p "Database password: " DB_PASSWORD
    read -p "n8n admin username: " N8N_USER
    read -sp "n8n admin password: " N8N_PASSWORD && echo
    read -p "Let's Encrypt email: " CERTBOT_EMAIL
    read -p "Anthropic API key (or leave blank): " ANTHROPIC_API_KEY
    read -p "Apify API token (or leave blank): " APIFY_API_TOKEN
    read -p "ElevenLabs API key (or leave blank): " ELEVENLABS_API_KEY
    read -p "Deepgram API key (or leave blank): " DEEPGRAM_API_KEY
    read -p "Twilio Account SID (or leave blank): " TWILIO_ACCOUNT_SID
    read -p "Twilio Auth Token (or leave blank): " TWILIO_AUTH_TOKEN
    read -p "Twilio Phone Number (or leave blank): " TWILIO_PHONE_NUMBER
    read -p "Google Client ID (or leave blank): " GOOGLE_CLIENT_ID
    read -p "Google Client Secret (or leave blank): " GOOGLE_CLIENT_SECRET
    read -p "Meta App ID (or leave blank): " META_APP_ID
    read -p "Meta App Secret (or leave blank): " META_APP_SECRET

    # Generate encryption key automatically
    N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)

    cat > "${PROJECT_DIR}/.env" <<EOF
DOMAIN=${DOMAIN}
DB_PASSWORD=${DB_PASSWORD}
N8N_USER=${N8N_USER}
N8N_PASSWORD=${N8N_PASSWORD}
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
CERTBOT_EMAIL=${CERTBOT_EMAIL}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
APIFY_API_TOKEN=${APIFY_API_TOKEN}
ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
META_APP_ID=${META_APP_ID}
META_APP_SECRET=${META_APP_SECRET}
EOF
fi

# Source the env file for use in this script
set -a
source "${PROJECT_DIR}/.env"
set +a

# ----------------------------------------------------------
# Step 6: Install Certbot for SSL certificates
# ----------------------------------------------------------
echo "[6/9] Installing Certbot..."
apt install -y certbot

# ----------------------------------------------------------
# Step 7: Get SSL certificate from Let's Encrypt
# ----------------------------------------------------------
echo "[7/9] Obtaining SSL certificate for ${DOMAIN}..."
mkdir -p "${PROJECT_DIR}/certbot/conf"
mkdir -p "${PROJECT_DIR}/certbot/www"

# Stop anything on port 80 first
systemctl stop nginx 2>/dev/null || true

certbot certonly --standalone \
    -d "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "${CERTBOT_EMAIL}" \
    --cert-path "${PROJECT_DIR}/certbot/conf"

# Copy certs to the project certbot directory
cp -rL /etc/letsencrypt/live "${PROJECT_DIR}/certbot/conf/" 2>/dev/null || true
cp -rL /etc/letsencrypt/archive "${PROJECT_DIR}/certbot/conf/" 2>/dev/null || true

# ----------------------------------------------------------
# Step 8: Replace domain placeholder in nginx.conf
# ----------------------------------------------------------
echo "[8/9] Configuring Nginx for ${DOMAIN}..."
sed -i "s/\${DOMAIN}/${DOMAIN}/g" "${PROJECT_DIR}/nginx.conf"

# ----------------------------------------------------------
# Step 9: Start all services
# ----------------------------------------------------------
echo "[9/9] Starting services..."
cd "${PROJECT_DIR}"
docker compose up -d

# Wait for services to be ready
echo "  Waiting for services to start..."
sleep 10

# Verify services are running
docker compose ps

echo ""
echo "==========================================="
echo "  Setup Complete!"
echo "==========================================="
echo ""
echo "  n8n is running at: https://${DOMAIN}"
echo "  Username: ${N8N_USER}"
echo ""
echo "  Next steps:"
echo "    1. Import your workflow JSON files into n8n"
echo "    2. Configure credentials in n8n settings"
echo "    3. Activate your workflows"
echo ""
echo "  Useful commands:"
echo "    cd ${PROJECT_DIR}"
echo "    docker compose logs -f        # View logs"
echo "    docker compose restart        # Restart services"
echo "    docker compose down           # Stop services"
echo ""
