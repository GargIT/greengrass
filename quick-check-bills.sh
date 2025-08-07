#!/bin/bash

# Snabb kontroll av fakturor för 2025-04-30
echo "🔍 Kontrollerar fakturor för period som slutar 2025-04-30..."
echo ""

cd /config/workspace/greengrass/backend

# Använd Prisma CLI för att köra en enkel query
npx prisma db execute --stdin << 'EOF'
SELECT 
    bp.periodName,
    bp.startDate,
    bp.endDate,
    COUNT(qb.id) as antal_fakturor,
    CASE 
        WHEN bp.endDate > CURRENT_DATE THEN 'FRAMTIDA'
        ELSE 'SLUTFÖRD'
    END as period_status
FROM "BillingPeriod" bp
LEFT JOIN "QuarterlyBill" qb ON bp.id = qb."billingPeriodId"
WHERE bp."endDate" = '2025-04-30'
GROUP BY bp.id, bp."periodName", bp."startDate", bp."endDate"
ORDER BY bp."startDate";
EOF

echo ""
echo "📊 Kontrollerar alla framtida fakturor..."

npx prisma db execute --stdin << 'EOF'
SELECT 
    bp."periodName",
    bp."endDate",
    h."householdNumber",
    h."ownerName",
    qb."totalAmount",
    qb.status
FROM "QuarterlyBill" qb
JOIN "BillingPeriod" bp ON qb."billingPeriodId" = bp.id
JOIN "Household" h ON qb."householdId" = h.id
WHERE bp."endDate" > CURRENT_DATE
ORDER BY bp."endDate", h."householdNumber";
EOF

echo ""
echo "✅ Kontroll slutförd!"
