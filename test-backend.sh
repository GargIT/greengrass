#!/bin/bash

# Start the backend server
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for server to start
sleep 5

# Test basic endpoints
echo "Testing API endpoints..."

echo "1. Testing households endpoint:"
curl -s http://localhost:3000/api/households | jq

echo -e "\n2. Testing utility services endpoint:"
curl -s http://localhost:3000/api/utility-services | jq

echo -e "\n3. Testing billing periods endpoint:"
curl -s http://localhost:3000/api/billing/periods | jq

echo -e "\n4. Testing dashboard endpoint:"
curl -s http://localhost:3000/api/reports/dashboard | jq

# Kill the backend server
echo -e "\nStopping backend server..."
kill $BACKEND_PID

echo "Backend test completed!"
