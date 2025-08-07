#!/bin/bash

echo "=== TESTING UPDATED BILLING LOGIC ==="

# Admin token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU3MGMzYTcwLTE1N2MtNGU5OC1hMjcxLWU1MjZhOWRiNjk1NSIsImVtYWlsIjoiYWRtaW5AZ3JvbmdyYXNldC5zZSIsInJvbGUiOiJBRE1JTiIsImhvdXNlaG9sZElkIjpudWxsLCJpYXQiOjE3MjMwNTQ3OTN9.dMR8DOmxBz7YlvRGLmYPi0HMRlzSZf5uPNHpJFGdIaM"
PERIOD_ID="9e0a4048-776e-4f50-975a-225b0b2df2cf"

echo "1. Deleting existing bills for period $PERIOD_ID..."
curl -s -X DELETE "http://localhost:3000/api/billing/delete-period-bills" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"billingPeriodId\": \"$PERIOD_ID\"}" | jq

echo -e "\n2. Generating new quarterly bills..."
curl -s -X POST "http://localhost:3000/api/billing/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"billingPeriodId\": \"$PERIOD_ID\",
    \"billType\": \"quarterly\"
  }" | jq

echo -e "\n3. Fetching generated bills to check utility costs..."
curl -s "http://localhost:3000/api/billing/quarterly?periodId=$PERIOD_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0:3] | .[] | {householdNumber: .household.householdNumber, memberFee, totalUtilityCosts, totalAmount}'

echo -e "\nDone!"
