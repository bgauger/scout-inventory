# Scout Troop Packing Manager

A comprehensive inventory management system for scout troops to track equipment, manage packing lists, and organize campout preparations.

## Features

### Core Features
- **📊 Dashboard**: Overview page with stats, progress bars, and at-a-glance information
- **📦 Box Inventory Management**: Track all equipment boxes with items, quantities, and replacement status
- **🚚 Trailer Management**: Mark which boxes are loaded in the trailer with weight tracking
- **📍 Campout Profiles**: Create packing profiles for different types of trips (weekend, summer camp, etc.)
- **🛒 Shopping List**: Automatically track items that need replacement
- **📱 QR Code Generation**: Generate and print QR codes for each box for easy mobile access
- **📝 Item Templates**: Quick-add common items from 8 pre-built templates (Cooking, First Aid, etc.)
- **🔍 Global Search**: Search across all boxes, items, and profiles instantly
- **🌓 Dark Mode**: Full dark mode support
- **🖨️ Print Functions**: Print box inventories, trailer manifests, and campout checklists
- **📱 Mobile Optimized**: Larger touch targets and responsive design for phones/tablets
- **🔄 Multi-Device Access**: Access from any device on your network
- **💾 Data Persistence**: PostgreSQL database for reliable data storage

## Technology Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Web Server**: Nginx
- **Deployment**: Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Basic understanding of command line
- (Optional) Proxmox or any Linux server for deployment

## Quick Start

### 1. Clone/Copy Files

Make sure you have all the project files in your directory:

```
inventory/
├── docker-compose.yml
├── database/
│   └── schema.sql
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── index.html
│   └── app.js
└── nginx/
    └── nginx.conf
```

### 2. Start the Application

```bash
# Navigate to the project directory
cd /path/to/inventory

# Start all services
docker-compose up -d
```

That's it! The application will be available at `http://localhost` or `http://your-server-ip`

### 3. Access the Application

- **Web Interface**: http://localhost (or your server IP)
- **API**: http://localhost/api (or your server IP)

## Development

### Running in Development Mode

```bash
# Start services and watch logs
docker-compose up

# Rebuild after code changes
docker-compose up --build

# Stop services
docker-compose down

# Stop services and remove volumes (deletes database data!)
docker-compose down -v
```

### Environment Variables

The backend uses these environment variables (configured in docker-compose.yml):

- `DB_HOST`: Database hostname (default: `db`)
- `DB_PORT`: Database port (default: `5432`)
- `DB_NAME`: Database name (default: `scout_inventory`)
- `DB_USER`: Database user (default: `postgres`)
- `DB_PASSWORD`: Database password (default: `postgres`)
- `PORT`: API server port (default: `3000`)

**For production, change the default database password!**

### Test Data Scripts

The project includes convenient scripts for managing test data:

#### Add Test Data

Populate the database with sample boxes, items, and profiles:

```bash
# From the project directory
./scripts/add-test-data.sh

# Or specify a custom API URL
./scripts/add-test-data.sh http://your-server-ip/api
```

This creates:
- 6 sample boxes (Cooking, First Aid, Dining, Shelter, Tools, Lighting)
- 29 items across all boxes
- 3 campout profiles
- Some boxes marked as "in trailer"

#### Clear All Data

Remove all boxes, items, and profiles from the database:

```bash
# From the project directory
./scripts/clear-all-data.sh

# Or specify a custom API URL
./scripts/clear-all-data.sh http://your-server-ip/api
```

⚠️ **Warning**: This permanently deletes all data! You'll be asked to confirm twice.

### API Endpoints

#### Boxes
- `GET /api/boxes` - Get all boxes with items
- `GET /api/boxes/:id` - Get a specific box
- `POST /api/boxes` - Create a new box
- `PUT /api/boxes/:id` - Update a box
- `DELETE /api/boxes/:id` - Delete a box

#### Items
- `POST /api/boxes/:boxId/items` - Add item to a box
- `PUT /api/items/:id` - Update an item
- `DELETE /api/items/:id` - Delete an item

#### Profiles
- `GET /api/profiles` - Get all campout profiles
- `POST /api/profiles` - Create a new profile
- `PUT /api/profiles/:id` - Update a profile
- `DELETE /api/profiles/:id` - Delete a profile

## Deployment

### Proxmox Deployment

#### Option 1: LXC Container

1. Create Ubuntu LXC container in Proxmox
2. Install Docker:
   ```bash
   apt update && apt install -y docker.io docker-compose
   ```
3. Copy project files to container
4. Run `docker-compose up -d`

#### Option 2: VM

1. Create Ubuntu VM in Proxmox
2. Install Docker:
   ```bash
   apt update && apt install -y docker.io docker-compose
   ```
3. Copy project files to VM
4. Run `docker-compose up -d`

### Production Considerations

1. **Change Default Passwords**: Edit docker-compose.yml and change `POSTGRES_PASSWORD`

2. **Enable HTTPS**: Use Nginx reverse proxy or Caddy for SSL/TLS

3. **Backups**: Regular database backups
   ```bash
   # Backup database
   docker exec scout_db pg_dump -U postgres scout_inventory > backup.sql

   # Restore database
   docker exec -i scout_db psql -U postgres scout_inventory < backup.sql
   ```

4. **Persistent Data**: Docker volume `postgres_data` persists database data

5. **Firewall**: Configure firewall to allow port 80 (and 443 for HTTPS)

### Updating the Application

```bash
# Pull latest code
git pull  # if using git

# Rebuild and restart
docker-compose up --build -d

# Database migrations (if schema changed)
# The schema is automatically applied on first run
# For updates, run migrations manually if needed
```

## Backup and Restore

### Export Data (via Web Interface)

1. Navigate to Settings tab
2. Click "Download Backup"
3. Save the JSON file

### Import Data (via Web Interface)

1. Navigate to Settings tab
2. Click "Upload Backup"
3. Select your backup JSON file

### Database Backup (Command Line)

```bash
# Backup
docker exec scout_db pg_dump -U postgres scout_inventory > scout_backup_$(date +%Y%m%d).sql

# Restore
docker exec -i scout_db psql -U postgres scout_inventory < scout_backup_YYYYMMDD.sql
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs api
docker-compose logs db
docker-compose logs web
```

### Database connection errors

```bash
# Check if database is healthy
docker-compose ps

# Restart database
docker-compose restart db

# Check database logs
docker-compose logs db
```

### Can't access the web interface

```bash
# Check if nginx is running
docker-compose ps web

# Check nginx logs
docker-compose logs web

# Verify ports are exposed
docker-compose port web 80
```

### Reset everything

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Port Configuration

Default ports used:
- **80**: Web interface (nginx)
- **3000**: API server (internal)
- **5432**: PostgreSQL (exposed for debugging, can be removed in production)

To change the web port, edit `docker-compose.yml`:

```yaml
services:
  web:
    ports:
      - "8080:80"  # Access on port 8080 instead
```

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Verify all services are running: `docker-compose ps`
3. Ensure ports aren't conflicting with other services

## License

This project is open source and available for scout troops to use and modify.

## Future Enhancements

Potential features to add:
- User authentication
- QR code generation for boxes
- Mobile app
- Email notifications for items needing replacement
- Photo uploads for boxes
- Barcode scanning
- Advanced reporting and analytics
