# Raspberry Pi Deployment Checklist

Use this checklist when deploying the Scout Inventory System to a Raspberry Pi in the field.

## Before You Leave (At Home/Office)

### Hardware Setup
- [ ] Raspberry Pi 3B+ or 4 (2GB+ RAM)
- [ ] 32GB+ microSD card (Class 10)
- [ ] Official Pi power supply
- [ ] Ethernet cable (optional backup to WiFi)
- [ ] Case for Pi (optional but recommended)

### Software Installation
- [ ] Flash Raspberry Pi OS Lite 64-bit to SD card
- [ ] Enable SSH during flash (via Pi Imager settings)
- [ ] Set hostname to `scout-inventory`
- [ ] Configure WiFi credentials (if using WiFi)
- [ ] Set username and password
- [ ] Boot Pi and verify you can SSH in
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Docker and docker-compose
- [ ] Run `setup-remote-access.sh` script
- [ ] Install and configure Tailscale
- [ ] Test Tailscale access from your laptop/phone
- [ ] Deploy the inventory application
- [ ] Change database password in `.env`
- [ ] Verify application works locally
- [ ] Verify application works via Tailscale
- [ ] Set up automatic backups (cron job)
- [ ] Set up health monitoring (systemd timer)
- [ ] Test SSH key authentication
- [ ] Disable password authentication for SSH

### Documentation
- [ ] Document Tailscale IP: `_______________`
- [ ] Document local IP (if static): `_______________`
- [ ] Save database password securely: `_______________`
- [ ] Save SSH key location: `_______________`
- [ ] Print QR code with Tailscale IP (optional)
- [ ] Create recovery USB with backup and docs

### Testing Checklist
- [ ] Can SSH via local network: `ssh pi@<local-ip>`
- [ ] Can SSH via Tailscale: `ssh pi@<tailscale-ip>`
- [ ] Can access web via local: `http://<local-ip>`
- [ ] Can access web via Tailscale: `http://<tailscale-ip>`
- [ ] Application loads correctly
- [ ] Can add/edit/delete boxes
- [ ] Can add/edit/delete items
- [ ] Database persists after reboot
- [ ] Containers auto-restart after reboot
- [ ] Health monitor script runs: `./pi-health-monitor.sh`
- [ ] Backup script works: `./backup.sh`

### Pre-Deployment
- [ ] Power off Pi safely: `sudo shutdown -h now`
- [ ] Remove SD card and make a backup image (optional)
- [ ] Reinsert SD card
- [ ] Pack Pi in protective case
- [ ] Pack power supply and cables
- [ ] Bring laptop/tablet for on-site verification
- [ ] Bring printed documentation (Tailscale IP, etc.)

## At Deployment Site

### Physical Setup
- [ ] Unpack Pi and connect power
- [ ] Connect to network (WiFi or Ethernet)
- [ ] Mount/secure Pi in location
- [ ] Wait 2-3 minutes for boot

### Verification
- [ ] Can reach Pi via Tailscale: `ssh pi@<tailscale-ip>`
- [ ] Check all containers running: `docker-compose -f docker-compose.prod.yml ps`
- [ ] Access web interface via Tailscale: `http://<tailscale-ip>`
- [ ] Test creating a box/item
- [ ] Run health check: `/usr/local/bin/pi-health-monitor.sh`
- [ ] Check system resources: `free -m && df -h`
- [ ] Verify date/time correct: `date`

### Local Network Configuration (Optional)
- [ ] Get local IP: `hostname -I`
- [ ] Configure static IP if needed
- [ ] Update local DNS if needed
- [ ] Test local network access
- [ ] Document local IP for on-site users

### Handoff
- [ ] Show users how to access (local URL or Tailscale)
- [ ] Explain basic operations
- [ ] Provide contact info for support
- [ ] Leave printed docs with Tailscale IP
- [ ] Show where Pi is physically located
- [ ] Explain power requirements (don't unplug!)

## Emergency Recovery Info

Keep this information with you:

```
Deployment Information
=====================
Date: _____________
Location: _____________
Hostname: scout-inventory
Local IP: _____________
Tailscale IP: _____________
SSH User: pi
Database Password: _____________
WiFi Network: _____________
Contact Person: _____________
Contact Phone: _____________
```

### If You Can't Connect

**Via Tailscale:**
1. Check your device is connected to Tailscale
2. Check Tailscale admin console for Pi status
3. Try SSH to wake up connection
4. Check internet connectivity at deployment site

**Via Local Network:**
1. Check Pi has power
2. Check network cable/WiFi
3. Try `ping scout-inventory.local`
4. Check router for Pi's IP address
5. Try `ssh pi@<ip-address>`

**Last Resort - Physical Access:**
1. Connect monitor and keyboard to Pi
2. Login with username/password
3. Check network: `ip addr`
4. Check Tailscale: `sudo tailscale status`
5. Restart Tailscale: `sudo systemctl restart tailscaled`
6. Check containers: `docker ps`
7. Restart app: `docker-compose -f docker-compose.prod.yml restart`

### Emergency Commands

```bash
# Check everything is running
docker-compose -f docker-compose.prod.yml ps

# View recent logs
docker-compose -f docker-compose.prod.yml logs --tail=50

# Restart everything
docker-compose -f docker-compose.prod.yml restart

# Full reboot
sudo reboot

# Check Tailscale
sudo tailscale status

# Reconnect Tailscale
sudo tailscale up

# Check system health
/usr/local/bin/pi-health-monitor.sh

# Create backup
docker exec scout_db pg_dump -U postgres scout_inventory > backup-emergency.sql
```

## Post-Deployment (Within 24 Hours)

- [ ] Monitor from home via Tailscale
- [ ] Check health monitor logs
- [ ] Verify backups are running
- [ ] Check with on-site users that it's working
- [ ] Monitor CPU temperature
- [ ] Monitor disk space
- [ ] Document any issues

## Weekly Maintenance (Remote)

- [ ] SSH in via Tailscale
- [ ] Run health check
- [ ] Check disk space: `df -h`
- [ ] Check backup files exist: `ls -lh ~/backups/`
- [ ] Check container status
- [ ] Review logs for errors
- [ ] Check system updates available
- [ ] Verify application still accessible

## Monthly Maintenance (Remote)

- [ ] Update system packages: `sudo apt update && sudo apt upgrade -y`
- [ ] Update Docker images: `docker-compose -f docker-compose.prod.yml pull`
- [ ] Restart containers: `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Clean up old Docker data: `docker system prune -a`
- [ ] Test backup restore procedure
- [ ] Verify Tailscale still connected
- [ ] Check SD card health (if possible)
- [ ] Update documentation if anything changed

## Troubleshooting Guide

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Can't SSH via Tailscale | Tailscale down or not connected | `sudo tailscale up` on Pi |
| Can't SSH at all | Pi powered off or network down | Check power and network at site |
| Web page won't load | Containers not running | `docker-compose restart` |
| Database errors | Out of memory/disk | Check `df -h` and `free -m` |
| Slow performance | High CPU temp or memory | Check health monitor |
| Can't reach Pi after reboot | Static IP changed | Check router DHCP leases |

## Support Resources

- Full deployment guide: [RASPBERRY_PI_DEPLOYMENT.md](RASPBERRY_PI_DEPLOYMENT.md)
- Quick start: [PI_QUICKSTART.md](PI_QUICKSTART.md)
- Production deployment: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- Security guide: [SECURITY_DEPLOYMENT_GUIDE.md](SECURITY_DEPLOYMENT_GUIDE.md)
- Features: [FEATURES.md](FEATURES.md)

## Success Criteria

The deployment is successful when:
- ✓ You can SSH to Pi via Tailscale from anywhere
- ✓ You can access web interface via Tailscale from anywhere
- ✓ All Docker containers are running
- ✓ Database is accepting connections
- ✓ Data persists across reboots
- ✓ Backups are running automatically
- ✓ Health monitoring is active
- ✓ On-site users can access the system
- ✓ Temperature and resources are within normal ranges

---

**Notes:**
- Tailscale IP is the KEY to remote access - document it immediately!
- Test remote access before leaving the deployment site
- Keep SSH keys secure and backed up
- Have a recovery plan before deployment
- Document everything - you'll thank yourself later
