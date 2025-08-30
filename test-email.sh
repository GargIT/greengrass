#!/bin/bash

# Email Test Script för Gröngräset
# Testar alla email-funktioner via API

API_BASE="http://localhost:3001/api"
ADMIN_EMAIL="admin@grongraset.se"
ADMIN_PASSWORD="admin123"
TEST_EMAIL="henrik.thornblom@gargit.se"

echo "🔐 Loggar in som admin..."
ACCESS_TOKEN=$(curl -s -X POST ${API_BASE}/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" | \
  jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login misslyckades!"
  exit 1
fi

echo "✅ Inloggad framgångsrikt!"

echo ""
echo "🔧 Testar SMTP-anslutning..."
SMTP_RESULT=$(curl -s -X GET ${API_BASE}/notifications/test \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo $SMTP_RESULT | jq '.'

echo ""
echo "📧 Skickar test-email (ny faktura)..."
NEW_INVOICE_RESULT=$(curl -s -X POST ${API_BASE}/notifications/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{
    \"to\": \"${TEST_EMAIL}\",
    \"templateName\": \"new_invoice\",
    \"testData\": {
      \"ownerName\": \"Test Användare\",
      \"householdNumber\": \"20\",
      \"invoiceNumber\": \"TEST-$(date +%Y%m%d-%H%M)\",
      \"periodName\": \"T2 2025\",
      \"billingPeriod\": \"T2 2025 (Maj-Augusti)\",
      \"dueDate\": \"2025-09-30\",
      \"totalAmount\": \"2,847.50\",
      \"amount\": \"2,847.50\",
      \"loginUrl\": \"http://localhost:5174\"
    }
  }")

echo $NEW_INVOICE_RESULT | jq '.'

echo ""
echo "⏰ Skickar test-email (påminnelse)..."
REMINDER_RESULT=$(curl -s -X POST ${API_BASE}/notifications/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{
    \"to\": \"${TEST_EMAIL}\",
    \"templateName\": \"payment_reminder\",
    \"testData\": {
      \"ownerName\": \"Test Användare\",
      \"householdNumber\": \"20\",
      \"invoiceNumber\": \"REM-$(date +%Y%m%d-%H%M)\",
      \"billingPeriod\": \"T2 2025 (Maj-Augusti)\",
      \"dueDate\": \"2025-08-15\",
      \"amount\": \"2,847.50\",
      \"daysOverdue\": \"15\"
    }
  }")

echo $REMINDER_RESULT | jq '.'

echo ""
echo "🔄 Processar email-kön..."
PROCESS_RESULT=$(curl -s -X POST ${API_BASE}/notifications/process-queue \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo $PROCESS_RESULT | jq '.'

echo ""
echo "📊 Hämtar kö-status..."
QUEUE_STATUS=$(curl -s -X GET ${API_BASE}/notifications/queue-status \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo $QUEUE_STATUS | jq '.'

echo ""
echo "🎉 Email-test slutfört!"
echo ""
echo "📧 Kontrollera ${TEST_EMAIL} för att bekräfta att emails har kommit fram."
echo "💡 Använd frontend på http://localhost:5174/system-admin för GUI-baserad testning."
