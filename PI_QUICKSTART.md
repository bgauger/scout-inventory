# Raspberry Pi Quick Start Guide

This is a condensed guide to get the Scout Inventory System running on a Raspberry Pi with remote access in under 30 minutes.

## What You'll Need

- Raspberry Pi 3B+ or 4 (2GB+ RAM)
- MicroSD card (32GB+)
- Power supply
- Network connection (WiFi or Ethernet)
- Another computer for initial setup

## Quick Setup Steps

### 1. Prepare the SD Card (5 minutes)

On your computer:

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Flash **Raspberry Pi OS Lite (64-bit)** to SD card
3. When prompted, configure:
   - Set hostname: `scout-inventory`
   - Enable SSH
   - Set username/password (remember these!)
   - Configure WiFi (if using WiFi)
4. Write to SD card

### 2. First Boot (5 minutes)

1. Insert SD card into Pi
2. Connect power and network
3. Wait 2-3 minutes for first boot
4. Find Pi's IP address:
   - Check your router's connected devices, OR
   - Try: `ping scout-inventory.local`

### 3. Initial Login and Update (5 minutes)

```bash
# SSH into the Pi (use password you set)
ssh pi@scout-inventory.local
# OR
ssh pi@<pi-ip-address>

# Update system
sudo apt update && sudo apt upgrade -y
```

### 4. Install Docker (3 minutes)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install docker-compose
sudo apt install -y docker-compose

# Log out and back in
exit
# (SSH back in)
```

### 5. Setup Remote Access (5 minutes)

Transfer and run the setup script:

```bash
# On your computer (from the inventory directory)
scp scripts/setup-remote-access.sh pi@scout-inventory.local:~/

# On the Pi
chmod +x setup-remote-access.sh
./setup-remote-access.sh
```

Follow the prompts:
- Let it update the system
- **Yes** to SSH keys (if you've added yours)
- **Yes** to Tailscale (for remote access)
- **Yes** to Fail2Ban (optional but recommended)
- **Yes** to automatic updates

**Important:** When Tailscale asks you to authenticate, follow the link and log in. Save the Tailscale IP shown!

### 6. Deploy the Application (5 minutes)

```bash
# On your computer, create the deployment bundle
cd /path/to/inventory
./create-deployment-bundle.sh

# Transfer to Pi
scp scout-inventory-deployment-*.tar.gz pi@scout-inventory.local:~/

# On the Pi
tar -xzf scout-inventory-deployment-*.tar.gz
cd scout-inventory-deployment-*/

# IMPORTANT: Edit .env and change the database password!
nano .env
# Change: DB_PASSWORD=CHANGE_THIS_PASSWORD_NOW
# To something secure

# Deploy
./deploy.sh

# Verify it's running
docker-compose -f docker-compose.prod.yml ps
```

### 7. Test Access (2 minutes)

**Local network:**
```bash
# Find Pi's IP
hostname -I

# Open in browser: http://<pi-ip>
```

**Remote access (via Tailscale):**
```bash
# Get Tailscale IP
tailscale ip -4

# Open in browser: http://<tailscale-ip>
```

## Quick Reference

### Useful Commands

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart application
docker-compose -f docker-compose.prod.yml restart

# Stop application
docker-compose -f docker-compose.prod.yml down

# Start application
docker-compose -f docker-compose.prod.yml up -d

# Check system health
cd ~/scout-inventory-deployment-*/
./pi-health-monitor.sh

# Backup database
docker exec scout_db pg_dump -U postgres scout_inventory > backup-$(date +%Y%m%d).sql
```

### Access Information

Save this information somewhere safe:

```
Hostname: scout-inventory
Local IP: [Run: hostname -I]
Tailscale IP: [Run: tailscale ip -4]
SSH: ssh pi@<tailscale-ip>
Web: http://<tailscale-ip>
Database Password: [What you set in .env]
```

### Remote Access

Once Tailscale is set up:

1. **Install Tailscale on your laptop/phone:**
   - Visit: https://tailscale.com/download
   - Install and log in with the same account
   - You'll now be on the same network as your Pi!

2. **Access from anywhere:**
   - SSH: `ssh pi@<tailscale-ip>`
   - Web: `http://<tailscale-ip>`
   - No port forwarding needed
   - Works from anywhere with internet

## Troubleshooting

### Can't SSH to Pi
```bash
# Check if Pi is on network
ping scout-inventory.local

# Check SSH is running (requires physical access)
sudo systemctl status ssh
```

### Containers not starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Try rebuilding
docker-compose -f docker-compose.prod.yml up -d --build
```

### Web page not loading
```bash
# Check containers are running
docker-compose -f docker-compose.prod.yml ps

# Check if port 80 is accessible
curl http://localhost

# Check firewall
sudo ufw status
```

### Lost Tailscale IP
```bash
# On the Pi
tailscale ip -4

# Or check in Tailscale admin console
# https://login.tailscale.com/admin/machines
```

## Pre-Deployment Checklist

Before taking the Pi to its deployment location:

- [ ] System updated
- [ ] Docker installed and working
- [ ] Tailscale installed and connected
- [ ] SSH key authentication working
- [ ] Application deployed and accessible
- [ ] Database password changed
- [ ] Tested local access
- [ ] Tested remote access via Tailscale
- [ ] Documented Tailscale IP
- [ ] WiFi credentials saved (if using WiFi)
- [ ] Backup created and tested

## What to Document

Write down and save securely:

1. **Tailscale IP:** `_____________`
2. **Local IP (if static):** `_____________`
3. **Database Password:** `_____________`
4. **SSH Key Location:** `_____________`
5. **Deployment Date:** `_____________`
6. **Deployment Location:** `_____________`

## Next Steps

After basic deployment:

1. **Set up automatic backups:**
   ```bash
   # Create backup script
   nano ~/backup.sh
   ```

   Add:
   ```bash
   #!/bin/bash
   cd ~/scout-inventory-deployment-*/
   docker exec scout_db pg_dump -U postgres scout_inventory > ~/backups/backup-$(date +%Y%m%d).sql
   find ~/backups -name "backup-*.sql" -mtime +7 -delete
   ```

   ```bash
   chmod +x ~/backup.sh

   # Add to crontab (daily at 2 AM)
   crontab -e
   # Add: 0 2 * * * /home/pi/backup.sh
   ```

2. **Set up health monitoring:**
   ```bash
   # Copy health monitor
   cd ~/scout-inventory-deployment-*/
   sudo cp scripts/pi-health-monitor.sh /usr/local/bin/
   sudo chmod +x /usr/local/bin/pi-health-monitor.sh

   # Test it
   /usr/local/bin/pi-health-monitor.sh
   ```

3. **Configure monitoring (optional):**
   - See RASPBERRY_PI_DEPLOYMENT.md for systemd timer setup

4. **Static IP (optional):**
   - If deploying on a network where you want a fixed local IP
   - See RASPBERRY_PI_DEPLOYMENT.md for configuration

## Support

For detailed information:
- Full deployment guide: [RASPBERRY_PI_DEPLOYMENT.md](RASPBERRY_PI_DEPLOYMENT.md)
- Production deployment: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- Application features: [FEATURES.md](FEATURES.md)
- Security guide: [SECURITY_DEPLOYMENT_GUIDE.md](SECURITY_DEPLOYMENT_GUIDE.md)

## Pro Tips

1. **Always test Tailscale access before deploying** - Make sure you can reach the Pi remotely from your phone/laptop
2. **Take a backup before deployment** - Easy to restore if something goes wrong
3. **Document everything** - You'll thank yourself later
4. **Test SSH key auth** - Make sure you can SSH in without password
5. **Static IP for local network** - Makes it easier if Tailscale has issues
6. **Print QR code** - Put Tailscale IP in QR code, tape to Pi case
7. **Keep power supply connected** - Pi needs stable power

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Can't SSH | Try both `scout-inventory.local` and IP address |
| Web page not loading | `docker-compose -f docker-compose.prod.yml restart` |
| Out of disk space | Check Docker: `docker system prune -a` |
| Containers not starting | Check logs: `docker-compose -f docker-compose.prod.yml logs` |
| Lost Tailscale connection | `sudo tailscale up` |
| Forgot database password | Check `.env` file in deployment directory |

## Emergency Recovery

If you need to start fresh:

```bash
# Stop and remove everything
cd ~/scout-inventory-deployment-*/
docker-compose -f docker-compose.prod.yml down -v

# Redeploy
./deploy.sh
```

**Note:** This deletes all data! Restore from backup if needed:
```bash
cat backup-YYYYMMDD.sql | docker exec -i scout_db psql -U postgres scout_inventory
```
