# Raspberry Pi 3 B+ Deployment Guide

This guide is specifically for deploying the Scout Inventory system on a **Raspberry Pi 3 B+** with 1GB RAM.

## Hardware Requirements

- **Raspberry Pi 3 B+** (1GB RAM)
- MicroSD card (16GB minimum, 32GB recommended)
- Power supply (5V 2.5A minimum)
- Optional: 7-inch touchscreen display for Service Manager

## Why Pi 3 B+ Needs Optimization

The Pi 3 B+ has only 1GB RAM, which is shared between:
- Operating system (~200-300MB)
- Docker daemon (~100MB)
- PostgreSQL database (~50-150MB)
- Node.js API (~30-60MB)
- Nginx web server (~5-10MB)
- Service Manager (~30-50MB)

**Total: ~500-700MB**, leaving only 300-500MB free for operations.

## Optimizations Included

### 1. Memory Limits
The `docker-compose.pi3.yml` file includes strict memory limits:
- **PostgreSQL**: 256MB limit (128MB reserved)
- **Node.js API**: 256MB limit (128MB reserved)
- **Nginx**: 64MB limit (32MB reserved)
- **Total containers**: ~576MB maximum

### 2. PostgreSQL Tuning
Optimized PostgreSQL settings for low-memory systems:
- `shared_buffers=32MB` (default would be 128MB)
- `effective_cache_size=128MB` (default would be 4GB)
- `work_mem=2MB` (default would be 4MB)
- `max_connections=20` (default would be 100)

### 3. Node.js Optimization
- `NODE_OPTIONS="--max-old-space-size=192"` limits Node.js heap to 192MB

## Installation Steps

### 1. Prepare Your Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose

# Install Git
sudo apt install -y git

# Reboot to apply changes
sudo reboot
```

### 2. Clone the Repository

```bash
cd ~
git clone git@github.com:bgauger/scout-inventory.git
cd scout-inventory
```

### 3. Start Services (Pi 3 Optimized)

```bash
# Use the Pi 3 optimized startup script
./start-pi3.sh
```

Or manually:
```bash
docker-compose -f docker-compose.pi3.yml up -d
```

### 4. Verify Services

```bash
# Check container status
docker-compose -f docker-compose.pi3.yml ps

# View logs
docker-compose -f docker-compose.pi3.yml logs -f

# Check memory usage
docker stats --no-stream
```

## Optional: Install Service Manager

The Service Manager provides a touchscreen interface to monitor and restart containers.

```bash
cd ~
git clone git@github.com:bgauger/Scout--inventory-.git service-manager
cd service-manager

# Run installation
chmod +x install.sh setup-kiosk.sh
./install.sh

# For touchscreen kiosk mode
./setup-kiosk.sh
sudo reboot
```

## Performance Expectations

### What to Expect:
- ✓ Application will work reliably for typical scout inventory use
- ✓ Suitable for 1-5 concurrent users
- ✓ Database can handle thousands of items/boxes
- ⚠ Initial startup is slow (2-3 minutes)
- ⚠ First Docker build takes 10-15 minutes
- ⚠ May feel sluggish during heavy operations

### What Won't Work Well:
- ✗ Many concurrent users (>10)
- ✗ Large file uploads
- ✗ Complex data exports with thousands of records
- ✗ Running other heavy applications simultaneously

## Troubleshooting

### Out of Memory Errors

If you see "Out of memory" errors:

```bash
# Check memory usage
free -h

# Check swap
sudo swapon --show

# Add more swap space (if needed)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Slow Performance

1. **Close unnecessary applications**
```bash
# Check what's using memory
top
# Press 'q' to quit
```

2. **Reduce database connections**
Edit `docker-compose.pi3.yml` and lower `max_connections` to 10

3. **Use only when needed**
Stop services when not in use:
```bash
docker-compose -f docker-compose.pi3.yml down
```

### Container Crashes

Check logs to identify the issue:
```bash
# View all logs
docker-compose -f docker-compose.pi3.yml logs

# View specific container
docker logs scout_db
docker logs scout_api
docker logs scout_web
```

Restart specific container:
```bash
docker restart scout_db
# or
docker restart scout_api
```

### Database Issues

If PostgreSQL won't start:
```bash
# Check database logs
docker logs scout_db

# Reset database (WARNING: deletes all data)
docker-compose -f docker-compose.pi3.yml down -v
docker-compose -f docker-compose.pi3.yml up -d
```

## Monitoring Resources

### Check Memory Usage
```bash
# System memory
free -h

# Container memory
docker stats --no-stream

# Detailed container info
docker-compose -f docker-compose.pi3.yml ps
```

### Check CPU Usage
```bash
# System CPU
top

# Container CPU
docker stats
```

## Upgrading to Pi 4 or Pi 5

If you upgrade to a Pi with more RAM (Pi 4 with 2GB+, or Pi 5):

```bash
# Switch to standard docker-compose
docker-compose -f docker-compose.pi3.yml down
docker-compose up -d
```

The standard `docker-compose.yml` removes memory limits for better performance.

## Best Practices for Pi 3 B+

1. **Auto-start on boot** - Use systemd to start services automatically
2. **Regular backups** - Export data regularly
3. **Monitor resources** - Check memory usage weekly
4. **Update carefully** - Test updates on non-production systems first
5. **Use SD card wisely** - High-quality SD card, minimize writes
6. **Clean old Docker images** - Run `docker system prune` monthly

## Commands Reference

```bash
# Start services (Pi 3 optimized)
./start-pi3.sh

# Stop services
docker-compose -f docker-compose.pi3.yml down

# View logs
docker-compose -f docker-compose.pi3.yml logs -f

# Restart all services
docker-compose -f docker-compose.pi3.yml restart

# Restart specific service
docker restart scout_db

# Check resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

## Getting Help

- Check logs: `docker-compose -f docker-compose.pi3.yml logs`
- Check memory: `free -h && docker stats --no-stream`
- GitHub Issues: https://github.com/bgauger/scout-inventory/issues

## Notes

- The Pi 3 B+ is at the minimum spec for this application
- Consider upgrading to Pi 4 (2GB+) or Pi 5 for better performance
- This configuration prioritizes stability over performance
- Memory limits prevent crashes but may slow down operations
