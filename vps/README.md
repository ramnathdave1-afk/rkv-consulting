# VPS Setup - Outreach Automation

## Requirements

- Hetzner VPS CX22 (2 vCPU, 4GB RAM, ~$4.50/mo) with Ubuntu 22.04/24.04
- A domain name with DNS A record pointed to the VPS IP

## Quick Start

1. **Provision VPS** - Create a CX22 instance on [Hetzner Cloud](https://www.hetzner.com/cloud) with Ubuntu.

2. **Point DNS** - Add an A record for your domain (e.g. `n8n.yourdomain.com`) to the VPS IP address. Wait for propagation.

3. **Upload files to VPS**:
   ```bash
   scp -r vps/* root@YOUR_VPS_IP:/root/setup/
   ```

4. **SSH in and run setup**:
   ```bash
   ssh root@YOUR_VPS_IP
   cd /root/setup
   # Option A: Fill in .env first (copy from .env.example)
   cp .env.example .env
   nano .env
   # Option B: The script will prompt you interactively
   chmod +x setup.sh
   ./setup.sh
   ```

5. **Access n8n** at `https://yourdomain.com` with the credentials you set.

6. **Import workflows** - In n8n, go to Settings > Import and load each workflow JSON file.

7. **Configure credentials** - In n8n, go to Settings > Credentials and set up API keys for each service (Anthropic, Twilio, Google, etc.).

## Services

| Service    | Port | Purpose                    |
|------------|------|----------------------------|
| PostgreSQL | 5432 | Database (internal only)   |
| n8n        | 5678 | Workflow automation engine |
| Nginx      | 80/443 | Reverse proxy + SSL      |

## Maintenance

```bash
cd /opt/outreach
docker compose logs -f          # View logs
docker compose restart          # Restart all services
docker compose pull && docker compose up -d  # Update images
```
