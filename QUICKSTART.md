# Quick Start Guide

## For Your Homelab (Proxmox)

### 1. Install Docker (if not already installed)

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Upload Project Files

Copy the entire `inventory` folder to your server, for example:

```bash
scp -r inventory/ user@your-server:/home/user/
```

### 3. Start the Application

```bash
cd /home/user/inventory
./start.sh
```

Or manually:

```bash
docker-compose up -d
```

### 4. Access the Application

Open your browser and go to:
- `http://your-server-ip`
- Example: `http://192.168.1.100`

## First Time Setup

1. **Create Your First Box**
   - Click on "Box Inventory" tab
   - Enter a box name (e.g., "Box 1 - Cooking")
   - Click "Add Box"

2. **Add Items to the Box**
   - Click "Add Item" on your new box
   - Enter item name and quantity
   - Click "Add Item"

3. **Create a Campout Profile**
   - Click "Campout Profiles" tab
   - Enter profile name (e.g., "Weekend Campout")
   - Click "Add Profile"
   - Check the boxes you need for this type of trip

4. **Mark Boxes in Trailer**
   - Click "Trailer Management" tab
   - Check boxes that are currently loaded
   - View stats and print manifest

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# Update after code changes
docker-compose up --build -d

# Backup database
docker exec scout_db pg_dump -U postgres scout_inventory > backup.sql

# Remove everything and start fresh
docker-compose down -v
docker-compose up -d
```

## Troubleshooting

### Can't access the web interface?

```bash
# Check if containers are running
docker-compose ps

# All three services should show "Up":
# - scout_web
# - scout_api
# - scout_db
```

### Port 80 already in use?

Edit `docker-compose.yml` and change the web port:

```yaml
services:
  web:
    ports:
      - "8080:80"  # Use port 8080 instead
```

Then restart: `docker-compose up -d`

### Database connection errors?

```bash
# Restart all services
docker-compose restart

# If that doesn't work, reset everything:
docker-compose down -v
docker-compose up -d
```

## Security Note

**IMPORTANT**: Before exposing to the internet, change the default database password in `docker-compose.yml`:

```yaml
environment:
  POSTGRES_PASSWORD: your-secure-password-here
```

## What's Next?

- Read the full [README.md](README.md) for detailed documentation
- Set up automated backups
- Configure HTTPS for secure access
- Consider adding authentication for multi-user access

## Need Help?

Check the logs for any errors:
```bash
docker-compose logs
```

The database starts fresh with no data - you'll need to add your boxes and items manually or import from a backup.
