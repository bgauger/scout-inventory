# Raspberry Pi Deployment Guide

This guide covers deploying the Scout Inventory System to a Raspberry Pi and ensuring remote access when deployed in the field.

## Hardware Requirements

- **Raspberry Pi**: Model 3B+ or 4 (2GB+ RAM recommended)
- **SD Card**: 32GB+ (Class 10 or better)
- **Network**: WiFi or Ethernet connection
- **Power**: Official Raspberry Pi power supply

## Remote Access Strategy

When the Pi is deployed remotely, you need reliable access for maintenance. We recommend **multiple layers** of remote access:

### 1. Tailscale VPN (Recommended - Easiest)
- Works behind NAT/firewalls
- No port forwarding needed
- Encrypted peer-to-peer connection
- Free for personal use (up to 100 devices)

### 2. SSH with Key Authentication
- Secure shell access
- Disable password authentication
- Use SSH keys only

### 3. Monitoring & Alerts
- Health check script
- Status reporting
- Automatic notifications

## Pre-Deployment Setup

### 1. Install Raspberry Pi OS

1. Download **Raspberry Pi OS Lite (64-bit)** from https://www.raspberrypi.com/software/
2. Flash to SD card using Raspberry Pi Imager
3. **Enable SSH before first boot**:
   - Mount the boot partition
   - Create empty file named `ssh` in boot partition:
     ```bash
     touch /path/to/boot/ssh
     ```

### 2. Initial Pi Configuration

First boot and configuration:

```bash
# SSH into the Pi (default password: raspberry)
ssh pi@raspberrypi.local

# Change default password immediately!
passwd

# Update system
sudo apt update && sudo apt upgrade -y

# Set hostname
sudo hostnamectl set-hostname scout-inventory

# Configure timezone
sudo timedatectl set-timezone America/New_York  # Adjust for your timezone

# Expand filesystem (if needed)
sudo raspi-config --expand-rootfs
```

### 3. Install Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add pi user to docker group
sudo usermod -aG docker pi

# Install Docker Compose
sudo apt install -y docker-compose

# Log out and back in for group changes to take effect
exit
# (ssh back in)

# Verify Docker works
docker run hello-world
```

## Setting Up Remote Access

### Option 1: Tailscale (Recommended)

Tailscale creates a secure mesh VPN - the Pi can be accessed from anywhere:

```bash
# Install Tailscale on Raspberry Pi
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale and authenticate
sudo tailscale up

# Follow the link provided to authorize the device
# The Pi will get a permanent Tailscale IP like 100.x.y.z
```

**On your laptop/desktop:**
```bash
# Install Tailscale
# Visit https://tailscale.com/download

# Start Tailscale
# Both devices will now be on the same virtual network!

# SSH to Pi via Tailscale IP
ssh pi@100.x.y.z  # Use the Tailscale IP shown in admin console

# Access web app via Tailscale IP
# http://100.x.y.z
```

**Benefits:**
- Works behind any firewall/NAT
- Encrypted connections
- No port forwarding
- Access from anywhere
- Free for personal use

### Option 2: ZeroTier (Alternative VPN)

Similar to Tailscale:

```bash
# Install ZeroTier
curl -s https://install.zerotier.com | sudo bash

# Join your network (create one at https://my.zerotier.com)
sudo zerotier-cli join YOUR_NETWORK_ID

# Authorize device in ZeroTier Central web interface
```

### Option 3: SSH Hardening (Always Do This)

Even with VPN, secure SSH properly:

Use the included setup script:
```bash
# Copy setup-remote-access.sh to the Pi
scp setup-remote-access.sh pi@raspberrypi.local:~/

# Run it
ssh pi@raspberrypi.local
chmod +x setup-remote-access.sh
./setup-remote-access.sh
```

Or manually configure:

```bash
# Generate SSH key on your laptop (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to Pi
ssh-copy-id pi@raspberrypi.local

# Test key-based login
ssh pi@raspberrypi.local

# If successful, disable password authentication
sudo nano /etc/ssh/sshd_config

# Change these settings:
# PasswordAuthentication no
# PermitRootLogin no
# PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

## Deploying the Application

### 1. Transfer Deployment Bundle

From your dev machine:

```bash
# Create the deployment bundle
cd /path/to/inventory
./create-deployment-bundle.sh

# Transfer to Pi (via local network)
scp scout-inventory-deployment-*.tar.gz pi@raspberrypi.local:~/

# Or via Tailscale
scp scout-inventory-deployment-*.tar.gz pi@100.x.y.z:~/
```

### 2. Extract and Configure

On the Pi:

```bash
# Extract bundle
tar -xzf scout-inventory-deployment-*.tar.gz
cd scout-inventory-deployment-*/

# Edit configuration
nano .env

# IMPORTANT: Change the database password!
# Change: DB_PASSWORD=CHANGE_THIS_PASSWORD_NOW
# To:     DB_PASSWORD=YourSecurePassword123!

# Save and exit (Ctrl+X, Y, Enter)
```

### 3. Deploy

```bash
# Run deployment script
./deploy.sh

# Or manually
docker-compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker-compose -f docker-compose.prod.yml ps

# Check logs if needed
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Test Access

**Local network:**
```bash
# Find Pi's local IP
hostname -I

# Access from browser on same network
# http://192.168.x.x
```

**Via Tailscale:**
```bash
# Get Tailscale IP
tailscale ip -4

# Access from browser anywhere
# http://100.x.y.z
```

## Setting Up Monitoring

Install the monitoring script:

```bash
# Copy monitoring script to Pi
scp pi-health-monitor.sh pi@raspberrypi.local:~/
ssh pi@raspberrypi.local

# Make executable
chmod +x pi-health-monitor.sh

# Set up as a systemd service for automatic health checks
sudo cp pi-health-monitor.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/pi-health-monitor.sh

# Create systemd service
sudo nano /etc/systemd/system/scout-health.service
```

Add this content:
```ini
[Unit]
Description=Scout Inventory Health Monitor
After=network.target docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/pi-health-monitor.sh
User=pi

[Install]
WantedBy=multi-user.target
```

Create a timer to run it periodically:
```bash
sudo nano /etc/systemd/system/scout-health.timer
```

Add:
```ini
[Unit]
Description=Run Scout Inventory Health Check every 15 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable scout-health.timer
sudo systemctl start scout-health.timer

# Check status
sudo systemctl status scout-health.timer
```

## Backup Strategy

### Automated Daily Backups

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
nano ~/backup-inventory.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d-%H%M%S)
cd ~/scout-inventory-deployment-*/

# Backup database
docker exec scout_db pg_dump -U postgres scout_inventory > $BACKUP_DIR/backup-$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup-*.sql" -mtime +7 -delete

echo "Backup completed: backup-$DATE.sql"
```

Make executable:
```bash
chmod +x ~/backup-inventory.sh
```

Add to crontab for daily backups at 2 AM:
```bash
crontab -e

# Add this line:
0 2 * * * /home/pi/backup-inventory.sh >> /home/pi/backups/backup.log 2>&1
```

## Troubleshooting Remote Access

### Can't Connect via Tailscale

```bash
# On Pi, check Tailscale status
sudo tailscale status

# Restart Tailscale if needed
sudo systemctl restart tailscaled

# Check if firewall is blocking
sudo ufw status
```

### SSH Connection Refused

```bash
# Check SSH is running
sudo systemctl status ssh

# Restart SSH
sudo systemctl restart ssh

# Check firewall (if enabled)
sudo ufw allow ssh
```

### Application Not Accessible

```bash
# Check Docker containers
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs

# Restart application
docker-compose -f docker-compose.prod.yml restart

# Check if port 80 is bound
sudo netstat -tulpn | grep :80
```

### Pi Not Responding

If you can't reach the Pi at all:

1. **Physical access required**: Connect monitor and keyboard
2. **Check network connection**: Verify WiFi/Ethernet is connected
3. **Check power**: Ensure adequate power supply
4. **Serial console**: Use USB serial adapter if configured

## Pre-Deployment Checklist

Before taking the Pi to deployment location:

- [ ] OS installed and updated
- [ ] SSH configured with key authentication
- [ ] Tailscale/ZeroTier installed and working
- [ ] Docker and Docker Compose installed
- [ ] Application deployed and tested
- [ ] Database password changed
- [ ] Backups configured
- [ ] Health monitoring enabled
- [ ] Static IP configured (if using local network)
- [ ] WiFi credentials saved (if using WiFi)
- [ ] Test remote access from outside network
- [ ] Document Tailscale/ZeroTier IPs
- [ ] Save SSH keys in safe location

## Static IP Configuration (Optional)

If deploying on a local network where DHCP might change IP:

```bash
# Edit dhcpcd.conf
sudo nano /etc/dhcpcd.conf

# Add at the end (adjust for your network):
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# For WiFi
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# Restart networking
sudo systemctl restart dhcpcd
```

## WiFi Configuration

If deploying with WiFi:

```bash
# Configure WiFi
sudo raspi-config
# Navigate to: System Options -> Wireless LAN
# Enter SSID and password

# Or edit directly
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```

Add:
```
network={
    ssid="YourNetworkName"
    psk="YourPassword"
}
```

## Power Management

Configure Pi to reboot automatically if hung:

```bash
# Add watchdog timer
sudo nano /boot/config.txt

# Add this line:
dtparam=watchdog=on

# Install watchdog package
sudo apt install watchdog

# Configure watchdog
sudo nano /etc/watchdog.conf

# Uncomment/add:
watchdog-device = /dev/watchdog
max-load-1 = 24

# Enable and start
sudo systemctl enable watchdog
sudo systemctl start watchdog
```

## Recovery Information

Keep this information in a safe place:

```
Raspberry Pi Details:
- Hostname: scout-inventory
- Local IP: [Fill in]
- Tailscale IP: [Fill in]
- SSH User: pi
- SSH Key Location: [Fill in]
- Database Password: [Fill in - keep secure!]
- WiFi Network: [Fill in]
- Deployment Location: [Fill in]
- Deployment Date: [Fill in]
```

## Support and Updates

### Remote Software Updates

```bash
# SSH into Pi (via Tailscale)
ssh pi@100.x.y.z

# Pull new deployment bundle
scp new-deployment.tar.gz pi@100.x.y.z:~/

# Extract and update (see PRODUCTION_DEPLOYMENT.md)
```

### Monitoring from Anywhere

With Tailscale, you can:
- SSH from anywhere: `ssh pi@100.x.y.z`
- Access web interface: `http://100.x.y.z`
- Check logs remotely
- Update application remotely
- Run backups remotely

## Security Best Practices

1. **Never use default passwords**
2. **Keep OS and Docker updated**
3. **Use SSH keys only** (disable password auth)
4. **Use VPN** (Tailscale/ZeroTier) for remote access
5. **Regular backups**
6. **Monitor logs** for suspicious activity
7. **Limit physical access** to the Pi
8. **Use strong database passwords**
9. **Keep Tailscale/ZeroTier updated**
10. **Test recovery procedures** before deployment

## Next Steps

After successful deployment:

1. Document all IPs and credentials (securely)
2. Test remote access from home
3. Test application functionality
4. Configure backups
5. Monitor for 24 hours before deployment
6. Create recovery plan
7. Train users on accessing the system
