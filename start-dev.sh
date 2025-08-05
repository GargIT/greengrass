#!/bin/bash

echo "======================================================="
echo "    Gröngräset Utility Billing System - Dev Setup    "
echo "======================================================="
echo "Starting development environment..."
echo ""

# Check if Docker is running
echo "Checking Docker..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "Please start Docker first"
    exit 1
else
    echo "✅ Docker is running"
fi

# Check if PostgreSQL container is running
echo "Checking PostgreSQL container..."
if ! docker ps | grep -q postgresql; then
    echo "❌ PostgreSQL container is not running"
    echo "Please start the PostgreSQL container first"
    exit 1
else
    echo "✅ PostgreSQL container is running"
fi

# Navigate to backend directory
cd backend

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found in backend directory"
    echo "Please create a .env file with the following content:"
    echo "DATABASE_URL=\"postgresql://postrgres_user:postgrespass1!!@localhost:5432/greengrass_db?schema=public\""
    echo "PORT=3001"
    echo "NODE_ENV=development"
    exit 1
else
    echo "✅ .env file found"
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Test database connection
echo "Testing database connection..."
if ! npx prisma db push --accept-data-loss 2>/dev/null; then
    echo "❌ Database connection failed"
    echo "Please check your DATABASE_URL in .env file"
    exit 1
else
    echo "✅ Database connection successful"
fi

# Seed the database (only if tables are empty)
echo "Checking and seeding database..."
npx prisma db seed 2>/dev/null || echo "⚠️  Database seeding skipped (already seeded or error)"

# Start backend in background
echo "Starting backend server on port 3001..."
npm run dev &
BACKEND_PID=$!

# Navigate to frontend directory
cd ../frontend

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Start frontend
echo "Starting frontend development server on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== Development servers started ==="
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo "Database: PostgreSQL container (postgresql)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
