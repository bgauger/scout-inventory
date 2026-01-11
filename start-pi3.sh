#!/bin/bash
# Startup script for Raspberry Pi 3 B+ (1GB RAM)
# Uses optimized docker-compose configuration with memory limits

set -e

echo "=================================="
echo "Scout Inventory - Pi 3 B+ Startup"
echo "=================================="
echo ""

# Check available memory
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
echo "Total system memory: ${TOTAL_MEM}MB"

if [ "$TOTAL_MEM" -lt 900 ]; then
    echo "WARNING: Low memory detected (< 900MB)"
    echo "This system may struggle under heavy load"
    echo ""
fi

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running"
    echo "Start Docker with: sudo systemctl start docker"
    exit 1
fi

echo "Starting services with Pi 3 optimized configuration..."
echo ""

# Use the optimized docker-compose file
docker-compose -f docker-compose.pi3.yml up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 5

# Check container status
echo ""
echo "Container Status:"
docker-compose -f docker-compose.pi3.yml ps

echo ""
echo "=================================="
echo "Services started successfully!"
echo "=================================="
echo ""
echo "Access the application at:"
echo "  http://localhost"
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Service Manager (if installed):"
echo "  http://localhost:5000"
echo ""
echo "To view logs: docker-compose -f docker-compose.pi3.yml logs -f"
echo "To stop: docker-compose -f docker-compose.pi3.yml down"
echo ""
