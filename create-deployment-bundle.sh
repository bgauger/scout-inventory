#!/bin/bash

# Scout Inventory System - Deployment Bundle Creator
# This script creates a production-ready deployment bundle

set -e

echo "=================================================="
echo "Scout Inventory - Deployment Bundle Creator"
echo "=================================================="
echo ""

# Configuration
ORIGINAL_DIR="$(pwd)"
BUNDLE_NAME="scout-inventory-deployment-$(date +%Y%m%d-%H%M%S)"
BUNDLE_DIR="/tmp/${BUNDLE_NAME}"
TARBALL_NAME="${BUNDLE_NAME}.tar.gz"

# Create temporary bundle directory
echo "Creating bundle directory..."
mkdir -p "${BUNDLE_DIR}"

# Copy necessary files and directories
echo "Copying application files..."

# Core directories
cp -r backend "${BUNDLE_DIR}/"
cp -r frontend "${BUNDLE_DIR}/"
cp -r database "${BUNDLE_DIR}/"
cp -r nginx "${BUNDLE_DIR}/"
cp -r scripts "${BUNDLE_DIR}/"

# Configuration and documentation files
cp docker-compose.yml "${BUNDLE_DIR}/"
cp start.sh "${BUNDLE_DIR}/"
cp .env.example "${BUNDLE_DIR}/"
cp README.md "${BUNDLE_DIR}/"
cp QUICKSTART.md "${BUNDLE_DIR}/"
cp FEATURES.md "${BUNDLE_DIR}/"
cp SECURITY_DEPLOYMENT_GUIDE.md "${BUNDLE_DIR}/"
cp RASPBERRY_PI_DEPLOYMENT.md "${BUNDLE_DIR}/"
cp PI_QUICKSTART.md "${BUNDLE_DIR}/"

# Create production-specific files
echo "Creating production configuration files..."

# Create production docker-compose file
cat > "${BUNDLE_DIR}/docker-compose.prod.yml" << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    container_name: scout_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-scout_inventory}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - scout_network

  # Node.js API Backend
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: scout_api
    restart: unless-stopped
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-scout_inventory}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD}
      PORT: 3000
      NODE_ENV: production
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - scout_network

  # Nginx Web Server
  web:
    image: nginx:alpine
    container_name: scout_web
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-80}:80"
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api
    networks:
      - scout_network

volumes:
  postgres_data:

networks:
  scout_network:
    driver: bridge
EOF

# Create production environment template
cat > "${BUNDLE_DIR}/.env" << 'EOF'
# Scout Inventory System - Production Configuration
# IMPORTANT: Change these values before deployment!

# Database Configuration
DB_NAME=scout_inventory
DB_USER=postgres
DB_PASSWORD=CHANGE_THIS_PASSWORD_NOW

# Web Server Configuration
WEB_PORT=80

# Deployment Notes:
# 1. Change DB_PASSWORD to a strong, unique password
# 2. Adjust WEB_PORT if port 80 is already in use
# 3. Keep this file secure - do not commit to version control
EOF

# Create deployment script
cat > "${BUNDLE_DIR}/deploy.sh" << 'EOF'
#!/bin/bash

# Scout Inventory System - Production Deployment Script

set -e

echo "=================================================="
echo "Scout Inventory System - Production Deployment"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please create a .env file from .env.example"
    echo "and configure your production settings."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    echo "Please install Docker first:"
    echo "  sudo apt update"
    echo "  sudo apt install -y docker.io docker-compose"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: docker-compose is not installed!"
    echo "Please install docker-compose first."
    exit 1
fi

# Check if password was changed
if grep -q "CHANGE_THIS_PASSWORD_NOW" .env; then
    echo "WARNING: Default database password detected!"
    echo "Please change DB_PASSWORD in .env before deploying to production."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Starting deployment..."
echo ""

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start containers
echo "Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check container status
echo ""
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=================================================="
echo "Deployment Complete!"
echo "=================================================="
echo ""
echo "Access your application at:"
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop:          docker-compose -f docker-compose.prod.yml down"
echo "  Restart:       docker-compose -f docker-compose.prod.yml restart"
echo "  Backup DB:     docker exec scout_db pg_dump -U postgres scout_inventory > backup.sql"
echo ""
EOF

chmod +x "${BUNDLE_DIR}/deploy.sh"

# Create README for deployment
cat > "${BUNDLE_DIR}/DEPLOYMENT_README.md" << 'EOF'
# Scout Inventory System - Deployment Bundle

This bundle contains everything needed to deploy the Scout Inventory System to your test laptop or production server.

## Quick Deployment Steps

### 1. Prerequisites

Ensure Docker and Docker Compose are installed:

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

### 2. Configure Environment

Edit the `.env` file and change the default password:

```bash
nano .env
```

**IMPORTANT**: Change `DB_PASSWORD` to a strong, unique password!

### 3. Deploy

Run the deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

Or manually:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Access Application

Open your browser and navigate to:
- `http://your-server-ip`
- Example: `http://192.168.1.100`

## File Structure

```
.
├── backend/              # Node.js API backend
├── frontend/             # HTML/JS frontend
├── database/             # Database schema
├── nginx/                # Nginx configuration
├── scripts/              # Utility scripts
├── docker-compose.prod.yml  # Production Docker Compose config
├── .env                  # Environment configuration
├── deploy.sh             # Deployment script
└── DEPLOYMENT_README.md  # This file
```

## Management Commands

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Stop Application
```bash
docker-compose -f docker-compose.prod.yml down
```

### Restart Application
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Backup Database
```bash
docker exec scout_db pg_dump -U postgres scout_inventory > backup-$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup.sql | docker exec -i scout_db psql -U postgres scout_inventory
```

### Update Application
```bash
# Stop containers
docker-compose -f docker-compose.prod.yml down

# Pull/copy new version
# ... (copy new files) ...

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

## Troubleshooting

### Containers won't start
```bash
# Check status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs
```

### Port 80 already in use
Edit `.env` and change `WEB_PORT`:
```
WEB_PORT=8080
```

Then restart:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Database connection errors
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# If issues persist, check password in .env matches
docker-compose -f docker-compose.prod.yml logs db
docker-compose -f docker-compose.prod.yml logs api
```

### Reset everything
```bash
# WARNING: This will delete all data!
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

## Security Considerations

1. **Change default password** in `.env` before deployment
2. **Firewall**: Ensure only necessary ports are exposed
3. **HTTPS**: Consider setting up a reverse proxy with SSL/TLS
4. **Backups**: Set up automated database backups
5. **Updates**: Keep Docker images and system packages updated

See `SECURITY_DEPLOYMENT_GUIDE.md` for detailed security information.

## Support

For more information, see:
- `README.md` - Full application documentation
- `QUICKSTART.md` - Quick start guide
- `FEATURES.md` - Feature documentation
- `SECURITY_DEPLOYMENT_GUIDE.md` - Security and deployment best practices
EOF

# Clean up node_modules from bundle (will be installed during Docker build)
echo "Cleaning up development files..."
rm -rf "${BUNDLE_DIR}/backend/node_modules"

# Create the tarball
echo ""
echo "Creating tarball..."
cd /tmp
tar -czf "${TARBALL_NAME}" "${BUNDLE_NAME}"

# Move tarball to current directory
mv "/tmp/${TARBALL_NAME}" "${ORIGINAL_DIR}/${TARBALL_NAME}"

# Clean up temporary directory
rm -rf "${BUNDLE_DIR}"

# Calculate size
SIZE=$(du -h "${ORIGINAL_DIR}/${TARBALL_NAME}" | cut -f1)

echo ""
echo "=================================================="
echo "Deployment Bundle Created Successfully!"
echo "=================================================="
echo ""
echo "Bundle: ${TARBALL_NAME}"
echo "Size: ${SIZE}"
echo "Location: ${ORIGINAL_DIR}/${TARBALL_NAME}"
echo ""
echo "To deploy on your test laptop:"
echo "  1. Copy ${TARBALL_NAME} to your test laptop"
echo "  2. Extract: tar -xzf ${TARBALL_NAME}"
echo "  3. cd ${BUNDLE_NAME}"
echo "  4. Edit .env and change the database password"
echo "  5. Run: ./deploy.sh"
echo ""
echo "Or manually with:"
echo "  docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
