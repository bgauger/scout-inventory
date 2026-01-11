# Production Deployment Guide

This guide explains how to create and deploy a production bundle of the Scout Inventory System.

## Creating the Deployment Bundle

### On Your Development Workstation

Run the bundle creation script:

```bash
./create-deployment-bundle.sh
```

This will:
- Package all necessary application files
- Create production-ready Docker Compose configuration
- Generate deployment scripts and documentation
- Create a compressed tarball (`.tar.gz`) file

The script outputs a file named: `scout-inventory-deployment-YYYYMMDD-HHMMSS.tar.gz`

## Transferring to Test Laptop

### Option 1: USB Drive
```bash
# Copy to USB drive
cp scout-inventory-deployment-*.tar.gz /media/usb/

# On test laptop, copy from USB
cp /media/usb/scout-inventory-deployment-*.tar.gz ~/
```

### Option 2: SCP (Network Transfer)
```bash
# From your dev workstation
scp scout-inventory-deployment-*.tar.gz user@test-laptop:/home/user/
```

### Option 3: Other Methods
- Upload to cloud storage (Dropbox, Google Drive, etc.)
- Use rsync
- Email (if file is small enough)

## Installing on Test Laptop

### 1. Prerequisites

Install Docker and Docker Compose:

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Optional: Add user to docker group (to avoid using sudo)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

### 2. Extract the Bundle

```bash
# Extract the tarball
tar -xzf scout-inventory-deployment-*.tar.gz

# Navigate into the extracted directory
cd scout-inventory-deployment-*/
```

### 3. Configure Environment

**IMPORTANT**: Edit the `.env` file and change the database password!

```bash
nano .env
```

Change this line:
```
DB_PASSWORD=CHANGE_THIS_PASSWORD_NOW
```

To something secure:
```
DB_PASSWORD=your_secure_password_here
```

Optional: Adjust other settings like `WEB_PORT` if port 80 is already in use.

### 4. Deploy

Use the included deployment script:

```bash
./deploy.sh
```

Or deploy manually:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5. Verify Deployment

Check that all containers are running:

```bash
docker-compose -f docker-compose.prod.yml ps
```

You should see three containers running:
- `scout_db` (PostgreSQL database)
- `scout_api` (Node.js API)
- `scout_web` (Nginx web server)

### 6. Access the Application

Open a web browser and navigate to:
```
http://localhost
```

Or from another computer on the network:
```
http://<test-laptop-ip>
```

To find your laptop's IP:
```bash
hostname -I
```

## Production vs Development Differences

The production bundle includes these improvements over the development setup:

### Security
- Database port only exposed to localhost (127.0.0.1:5432)
- API port only exposed to localhost (127.0.0.1:3000)
- Environment-based configuration (no hardcoded passwords)
- Separate network for container communication

### Configuration
- Environment variables in `.env` file
- Production-optimized Docker Compose settings
- `NODE_ENV=production` for better performance
- Restart policy: `unless-stopped` for automatic recovery

### Deployment
- Automated deployment script with validation
- Pre-deployment checks (Docker installed, password changed, etc.)
- Clear deployment instructions
- Easy backup and restore procedures

## Management Commands

All commands use the production Docker Compose file:

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
```

### Stop Application
```bash
docker-compose -f docker-compose.prod.yml down
```

### Restart Application
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Rebuild After Changes
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## Backup and Restore

### Create Backup
```bash
# Create a timestamped backup
docker exec scout_db pg_dump -U postgres scout_inventory > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore from Backup
```bash
cat backup-20241028-120000.sql | docker exec -i scout_db psql -U postgres scout_inventory
```

### Automated Daily Backups

Create a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /path/to/deployment && docker exec scout_db pg_dump -U postgres scout_inventory > backups/backup-$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Check Container Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View Container Logs
```bash
docker-compose -f docker-compose.prod.yml logs
```

### Port Conflicts

If port 80 is already in use, edit `.env`:
```
WEB_PORT=8080
```

Then restart:
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Database Connection Issues

Check database logs:
```bash
docker-compose -f docker-compose.prod.yml logs db
```

Verify password matches in `.env` and Docker Compose configuration.

### Reset Everything

**WARNING**: This deletes all data!

```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

## Updating the Application

When you want to deploy a new version:

1. Create a new deployment bundle on your dev workstation
2. Transfer to test laptop
3. Extract to a new directory
4. Copy your existing `.env` file to the new directory
5. Stop the old deployment
6. Start the new deployment

```bash
# Stop old version
cd /path/to/old/deployment
docker-compose -f docker-compose.prod.yml down

# Start new version
cd /path/to/new/deployment
cp /path/to/old/deployment/.env .
docker-compose -f docker-compose.prod.yml up -d --build
```

## Security Best Practices

1. **Strong Passwords**: Use a strong, unique password for the database
2. **Firewall**: Configure firewall to only allow necessary ports
3. **HTTPS**: For internet access, set up SSL/TLS (use nginx reverse proxy)
4. **Regular Backups**: Automate database backups
5. **Updates**: Keep Docker and system packages updated
6. **Access Control**: Limit physical and network access to the server

For detailed security information, see `SECURITY_DEPLOYMENT_GUIDE.md` in the bundle.

## Bundle Contents

The deployment bundle includes:

```
scout-inventory-deployment-YYYYMMDD-HHMMSS/
├── backend/                      # Node.js API backend
├── frontend/                     # HTML/JS frontend
├── database/                     # Database schema
├── nginx/                        # Nginx configuration
├── scripts/                      # Utility scripts
├── docker-compose.prod.yml       # Production Docker Compose
├── .env                          # Environment configuration
├── deploy.sh                     # Automated deployment script
├── README.md                     # Application documentation
├── QUICKSTART.md                 # Quick start guide
├── FEATURES.md                   # Feature documentation
├── SECURITY_DEPLOYMENT_GUIDE.md  # Security guide
└── DEPLOYMENT_README.md          # Deployment instructions
```

## Next Steps

After successful deployment:

1. **Test the application** - Verify all features work correctly
2. **Set up backups** - Configure automated database backups
3. **Configure monitoring** - Set up log monitoring if needed
4. **Document access** - Note the URL and credentials
5. **Plan updates** - Establish a process for future updates

## Support

For more information:
- Application features: See `FEATURES.md`
- Security: See `SECURITY_DEPLOYMENT_GUIDE.md`
- General usage: See `README.md`
- Quick reference: See `QUICKSTART.md`
