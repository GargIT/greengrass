#!/bin/bash

echo "=== PostgreSQL Container Connection Test ==="
echo ""

# Check if postgresql container is running
echo "1. Checking if PostgreSQL container is running..."
if docker ps | grep -q postgresql; then
    echo "✅ PostgreSQL container is running"
    docker ps | grep postgresql
else
    echo "❌ PostgreSQL container is not running"
    echo "Available containers:"
    docker ps
fi

echo ""

# Test different connection approaches
echo "2. Testing database connection..."

# Try connecting to the container directly
echo "Trying to connect to postgresql container..."
if docker exec postgresql psql -U postrgres_user -d grongrasset_db -c "SELECT version();" 2>/dev/null; then
    echo "✅ Direct container connection works"
else
    echo "❌ Direct container connection failed"
fi

echo ""

# Check what databases exist
echo "3. Checking available databases..."
docker exec postgresql psql -U postrgres_user -l 2>/dev/null || echo "❌ Could not list databases"

echo ""

# Test network connectivity
echo "4. Testing network connectivity..."
if docker exec postgresql ping -c 1 postgresql 2>/dev/null; then
    echo "✅ Container can reach itself via hostname"
else
    echo "❌ Container networking issue"
fi

echo ""
echo "=== Connection String Suggestions ==="

# Get container IP
CONTAINER_IP=$(docker inspect postgresql --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
if [ ! -z "$CONTAINER_IP" ]; then
    echo "Container IP: $CONTAINER_IP"
    echo "Try: postgresql://postrgres_user:postgrespass1!!@${CONTAINER_IP}:5432/grongrasset_db"
fi

echo "Current: postgresql://postrgres_user:postgrespass1!!@postgresql:5432/grongrasset_db"
echo "Alternative: postgresql://postrgres_user:postgrespass1!!@localhost:5432/grongrasset_db"
echo ""
