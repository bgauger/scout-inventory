# 🔒 Security Deployment Guide

## ⚠️ IMPORTANT: Your application will be internet-facing

This guide will help you deploy the secured version of your Scout Inventory application safely.

---

## 📋 What I've Created For You

### ✅ Already Created:
1. **`.env.example`** - Environment variables template
2. **`backend/server-secured.js`** - Secured API server with:
   - JWT authentication
   - Input validation
   - Rate limiting
   - Security headers (helmet)
   - Proper CORS
   - Request size limits
   - Error handling

3. **`backend/middleware/auth.js`** - Authentication middleware
4. **`backend/middleware/validators.js`** - Input validation
5. **`backend/routes/auth.js`** - Login/user management routes
6. **`database/auth-schema.sql`** - User authentication tables
7. **`backend/package.json`** - Updated with security dependencies

---

## 🚀 Step-by-Step Deployment

### Step 1: Install New Dependencies

```bash
cd /mnt/dev/home/projects/scouts/inventory/backend
npm install
```

This installs:
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers
- `express-validator` - Input validation

---

### Step 2: Generate Secure Credentials

```bash
# Generate a random JWT secret (min 32 characters)
openssl rand -base64 32

# Generate a strong database password
openssl rand -base64 24
```

---

### Step 3: Create .env File

```bash
cp .env.example .env
nano .env
```

Replace the placeholders with your generated values:

```env
DB_PASSWORD=<YOUR_STRONG_DB_PASSWORD_HERE>
JWT_SECRET=<YOUR_RANDOM_SECRET_FROM_STEP2>
ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com
NODE_ENV=production
```

**CRITICAL**: Never commit `.env` to version control!

---

### Step 4: Add Authentication Tables

```bash
# Run the migration to add user tables
docker exec -i scout_db psql -U postgres scout_inventory < database/auth-schema.sql
```

This creates:
- `users` table
- `audit_log` table
- Default admin user (username: `admin`, password: `admin123`)

**⚠️ CHANGE THE DEFAULT PASSWORD IMMEDIATELY!**

---

### Step 5: Update Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: scout_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: scout_inventory
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # From .env file
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/auth-schema.sql:/docker-entrypoint-initdb.d/02-auth-schema.sql
    # NO EXTERNAL PORT EXPOSURE - only accessible within Docker network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: scout_api
    restart: unless-stopped
    env_file:
      - .env
    # NO EXTERNAL PORT EXPOSURE - only nginx can access
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules

  web:
    image: nginx:alpine
    container_name: scout_web
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"  # For HTTPS
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro  # SSL certificates
    depends_on:
      - api

volumes:
  postgres_data:
```

---

### Step 6: Update Backend to Use Secured Server

```bash
cd backend
mv server.js server-old.js
mv server-secured.js server.js
```

---

### Step 7: Setup HTTPS (Required for Production!)

#### Option A: Let's Encrypt (Recommended - Free)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

#### Option B: Self-Signed (Development/Testing Only)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/nginx.key \
  -out nginx/ssl/nginx.crt
```

Update `nginx/nginx.conf` to add HTTPS:

```nginx
server {
    listen 80;
    listen 443 ssl http2;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    # Redirect HTTP to HTTPS
    if ($scheme = http) {
        return 301 https://$server_name$request_uri;
    }

    # Rest of your nginx config...
}
```

---

### Step 8: Deploy Secured Version

```bash
# Stop current containers
docker-compose down

# Start with production config
docker-compose -f docker-compose.prod.yml up --build -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

### Step 9: Test Security

```bash
# Try to access API without authentication (should fail)
curl http://your-domain.com/api/boxes
# Expected: {"error":"Access token required"}

# Login
curl -X POST http://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Expected: {"token":"...", "user":{...}}

# Use token to access API
TOKEN="<token_from_above>"
curl http://your-domain.com/api/boxes \
  -H "Authorization: Bearer $TOKEN"
# Expected: [array of boxes]
```

---

### Step 10: Change Default Admin Password

After first login, immediately change the password:

```bash
curl -X POST http://your-domain.com/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "YourStrongPassword123!"
  }'
```

---

## 👥 User Management

### Create Additional Users

```bash
# Login as admin first, get token

# Create a viewer (read-only)
curl -X POST http://your-domain.com/api/auth/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "viewer1",
    "email": "viewer@example.com",
    "password": "SecurePassword123!",
    "role": "viewer"
  }'

# Create an editor (can modify data)
curl -X POST http://your-domain.com/api/auth/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "editor1",
    "email": "editor@example.com",
    "password": "SecurePassword123!",
    "role": "editor"
  }'
```

### User Roles

- **admin**: Full access (manage users, modify all data)
- **editor**: Can modify boxes, items, profiles, templates
- **viewer**: Read-only access

---

## 🔐 Frontend Login Integration

The backend is now secure, but you need to update the frontend to:

1. Show login page
2. Store JWT token
3. Include token in all API requests
4. Handle token expiration

**Would you like me to create the frontend login system next?**

---

## ✅ Security Checklist

Before going live:

- [ ] Changed default admin password
- [ ] Set strong database password in `.env`
- [ ] Set random JWT secret in `.env`
- [ ] Configured HTTPS with valid certificate
- [ ] Updated ALLOWED_ORIGINS in `.env`
- [ ] Removed database port exposure (5432)
- [ ] Removed API port exposure (3000)
- [ ] Created at least one admin and one viewer user
- [ ] Tested login and authentication
- [ ] Tested rate limiting
- [ ] Set up firewall rules
- [ ] Configured automatic backups

---

## 🔧 Troubleshooting

### "CORS policy: Origin not allowed"
Update `ALLOWED_ORIGINS` in `.env` to include your domain.

### "Access token required"
The frontend needs to be updated to send JWT tokens. See next section.

### Database connection errors
Ensure `.env` file exists and DB_PASSWORD matches docker-compose.

### Certificate errors
If using self-signed certificates, browsers will show warnings. Use Let's Encrypt for production.

---

## 🎯 Next Steps

1. **Create Frontend Login Page** - I can create this for you
2. **Add XSS Protection** - Sanitize HTML inputs with DOMPurify
3. **Setup Monitoring** - Add logging and alerts
4. **Configure Backups** - Automatic daily database backups
5. **Add 2FA** - Two-factor authentication (optional)

**Ready to continue? Let me know which part you'd like me to implement next!**
