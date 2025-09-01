#!/bin/bash

# Test script for meter reading reminders

echo "🧪 Testing Meter Reading Reminders System..."

# Set base URL
BASE_URL="http://localhost:3001"

# Get auth token (assuming you have credentials)
echo "Getting auth token..."
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@grongraset.se",
    "password": "admin123"
  }')

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token. Make sure backend is running and credentials are correct."
  exit 1
fi

echo "✅ Auth token received"

# Test 1: Get billing periods
echo ""
echo "📅 Testing: Get billing periods..."
curl -s -X GET "$BASE_URL/api/notifications/billing-periods" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Test 2: Send advance meter reading reminders
echo ""
echo "📧 Testing: Send advance meter reading reminders..."
curl -s -X POST "$BASE_URL/api/notifications/send-meter-reading-reminders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reminderType": "advance"
  }'

# Test 3: Send overdue meter reading reminders
echo ""
echo "⚠️ Testing: Send overdue meter reading reminders..."
curl -s -X POST "$BASE_URL/api/notifications/send-meter-reading-reminders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reminderType": "overdue"
  }'

# Test 4: Test meter reading reminder email template
echo ""
echo "📮 Testing: Meter reading reminder email template..."
curl -s -X POST "$BASE_URL/api/notifications/test-email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "henrik.thornblom@gargit.se",
    "templateName": "meter_reading_reminder",
    "testData": {
      "ownerName": "Henrik Thornblom",
      "householdNumber": "20",
      "periodName": "2025-08-31",
      "readingDeadline": "2025-08-31",
      "missingServices": "- Vatten",
      "missingServicesHtml": "<li>Vatten</li>",
      "loginUrl": "https://5174.code.gargit.se/"
    }
  }'

# Test 5: Test urgent meter reading email template
echo ""
echo "🚨 Testing: Urgent meter reading email template..."
curl -s -X POST "$BASE_URL/api/notifications/test-email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "henrik.thornblom@gargit.se", 
    "templateName": "meter_reading_urgent",
    "testData": {
      "ownerName": "Henrik Thornblom",
      "householdNumber": "20",
      "periodName": "2025-08-31",
      "readingDeadline": "2025-08-31",
      "daysOverdue": "2",
      "missingServices": "- Vatten",
      "missingServicesHtml": "<li>Vatten</li>",
      "loginUrl": "https://5174.code.gargit.se/"
    }
  }'

# Test 6: Check email queue status
echo ""
echo "📬 Testing: Email queue status..."
curl -s -X GET "$BASE_URL/api/notifications/queue-status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

echo ""
echo "✅ All tests completed!"
echo "Check the email queue and logs to verify the reminders were sent correctly."
