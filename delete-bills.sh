#!/bin/bash

# Script för att ta bort fakturor för en specifik period
# Använd: ./delete-bills.sh "2025-04-30"

PERIOD_END_DATE="$1"

if [ -z "$PERIOD_END_DATE" ]; then
    echo "❌ Ange slutdatum för perioden, t.ex: ./delete-bills.sh '2025-04-30'"
    exit 1
fi

echo "🔍 Söker efter fakturor för period som slutar: $PERIOD_END_DATE"

cd backend

# Kontrollera först
echo "📊 Kontrollerar befintliga fakturor..."
npx prisma db execute --stdin <<EOF
SELECT 
    bp.periodName,
    bp.startDate,
    bp.endDate,
    COUNT(qb.id) as bill_count
FROM BillingPeriod bp
LEFT JOIN QuarterlyBill qb ON bp.id = qb.billingPeriodId
WHERE bp.endDate = '$PERIOD_END_DATE'
GROUP BY bp.id, bp.periodName, bp.startDate, bp.endDate;
EOF

echo ""
echo "⚠️  Vill du verkligen ta bort alla fakturor för denna period? (y/N)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🗑️ Tar bort fakturor..."
    
    # Ta bort fakturor
    npx prisma db execute --stdin <<EOF
DELETE FROM QuarterlyBill 
WHERE billingPeriodId IN (
    SELECT id FROM BillingPeriod WHERE endDate = '$PERIOD_END_DATE'
);
EOF
    
    echo "✅ Fakturor borttagna för period som slutar $PERIOD_END_DATE"
    echo "🎉 Nu kan du generera nya fakturor!"
else
    echo "❌ Avbruten - inga fakturor togs bort"
fi
