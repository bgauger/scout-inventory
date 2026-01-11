#!/bin/bash

echo "======================================"
echo "Scout Troop Packing Manager"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "Please install Docker Compose first"
    exit 1
fi

echo "✓ Docker is installed"
echo "✓ Docker Compose is installed"
echo ""

# Check if services are already running
if docker-compose ps | grep -q "Up"; then
    echo "⚠️  Services are already running"
    echo ""
    read -p "Do you want to restart them? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Restarting services..."
        docker-compose down
    else
        echo "Exiting..."
        exit 0
    fi
fi

echo "Starting Scout Packing Manager..."
echo ""

# Start services
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "======================================"
    echo "✓ Scout Packing Manager is running!"
    echo "======================================"
    echo ""
    echo "Access the application at:"
    echo "  http://localhost"
    echo ""
    echo "If accessing from another computer:"
    echo "  http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "To view logs:"
    echo "  docker-compose logs -f"
    echo ""
    echo "To stop the application:"
    echo "  docker-compose down"
    echo ""
else
    echo ""
    echo "❌ Failed to start services!"
    echo "Check the logs with: docker-compose logs"
    exit 1
fi
