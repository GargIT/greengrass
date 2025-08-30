# SystemAdmin - Email Testing Guide

## Översikt

SystemAdmin-sidan är en administratör-only sida för att testa och hantera email-notifikationssystemet i Gröngräset samfällighetsförening.

## Åtkomst

- **URL**: http://localhost:5174/system-admin
- **Behörighet**: Endast ADMIN-användare
- **Navigering**: Välj "Systemadmin" i vänster-menyn

## Funktioner

### 1. SMTP Connection Test

- **Syfte**: Verifiera att anslutning till email-servern fungerar
- **Använd när**: Vid uppsättning eller felsökning av email-konfiguration
- **Resultat**: Visar om SMTP-anslutningen är aktiv och fungerande

### 2. Email Queue Management

- **Refresh Status**: Hämtar aktuell status för email-kön
- **Process Queue**: Processar väntande emails manuellt (normalt sker automatiskt var 5:e minut)
- **Queue Statistics**: Visar antal emails per status (SENT, PENDING, FAILED, etc.)

### 3. Send Test Email

- **Template Selection**: Välj mellan olika email-mallar:
  - `new_invoice` - Ny faktura
  - `payment_reminder` - Betalningspåminnelse
  - `payment_confirmation` - Betalningsbekräftelse
- **Template Data**: JSON-data som fylls i email-mallen
- **Test Recipients**: Skicka till valfri email-adress för testning

### 4. Recent Emails Table

- **Email History**: Visar senaste emails med status och detaljer
- **Status Icons**: Visuell indikation av email-status
- **Error Details**: Hover över fel-ikoner för felmeddelanden
- **Timestamps**: Visar när email skapades och skickades

## Email Templates

### New Invoice Template

```json
{
  "ownerName": "Användarens namn",
  "householdNumber": "Hushållsnummer",
  "invoiceNumber": "Fakturanummer",
  "periodName": "T2 2025",
  "billingPeriod": "T2 2025 (Maj-Augusti)",
  "dueDate": "2025-09-30",
  "totalAmount": "2,847.50",
  "amount": "2,847.50",
  "loginUrl": "http://localhost:5174"
}
```

### Payment Reminder Template

```json
{
  "ownerName": "Användarens namn",
  "householdNumber": "Hushållsnummer",
  "invoiceNumber": "Fakturanummer",
  "billingPeriod": "T2 2025 (Maj-Augusti)",
  "dueDate": "2025-08-15",
  "amount": "2,847.50",
  "daysOverdue": "15"
}
```

### Payment Confirmation Template

```json
{
  "ownerName": "Användarens namn",
  "invoiceNumber": "Fakturanummer",
  "amount": "2,847.50",
  "paymentDate": "2025-08-25"
}
```

## CLI Alternativ

För snabb testning via terminal, använd:

```bash
./test-email.sh
```

Detta script testar automatiskt:

- SMTP-anslutning
- Skickar test-emails med olika templates
- Processar email-kön
- Visar kö-status

## Felsökning

### Email skickas inte

1. Kontrollera SMTP-anslutning med "Test SMTP Connection"
2. Verifiera `.env` konfiguration:
   ```
   SMTP_HOST=mailout.privat.bahnhof.se
   SMTP_PORT=587
   SMTP_USER=mb859831
   SMTP_PASS=5175Kkht
   ```
3. Kolla email-kön för felmeddelanden

### Email kommer inte fram

1. Kontrollera spam-mapp
2. Verifiera avsändar-email (`SMTP_FROM`)
3. Testa med olika mottagare

### Template-fel

1. Validera JSON-syntax i template data
2. Kontrollera att alla nödvändiga variabler finns
3. Testa med default template data först

## API Endpoints

SystemAdmin-sidan använder följande API endpoints:

- `GET /api/notifications/test` - SMTP test
- `GET /api/notifications/queue-status` - Kö-status
- `POST /api/notifications/process-queue` - Processning
- `POST /api/notifications/test-email` - Test-email

Alla endpoints kräver ADMIN-behörighet.
