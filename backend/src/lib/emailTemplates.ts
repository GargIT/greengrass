import { emailService } from "../lib/emailService";

/**
 * Default email templates for the system
 */
export const emailTemplates = {
  newInvoice: {
    name: "new_invoice",
    subject: "Ny faktura från Gröngräset - {{periodName}}",
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .invoice-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4CAF50; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gröngräset Samfällighetsförening</h1>
            <h2>Ny Faktura Tillgänglig</h2>
          </div>
          
          <div class="content">
            <p>Hej {{ownerName}},</p>
            
            <p>En ny faktura är nu tillgänglig för ditt hushåll ({{householdNumber}}) för faktureringsperioden <strong>{{billingPeriod}}</strong>.</p>
            
            <div class="invoice-details">
              <h3>Faktura Detaljer</h3>
              <p><strong>Fakturanummer:</strong> {{invoiceNumber}}</p>
              <p><strong>Period:</strong> {{billingPeriod}}</p>
              <p><strong>Förfallodatum:</strong> {{dueDate}}</p>
              <p><strong>Total summa:</strong> <span class="amount">{{totalAmount}} SEK</span></p>
            </div>
            
            <p>Du kan logga in i vårt system för att se den detaljerade fakturaspecifikationen och hantera din betalning.</p>
            
            <div style="text-align: center;">
              <a href="{{loginUrl}}" class="button">Logga In för Att Se Faktura</a>
            </div>
            
            <p><strong>Viktigt:</strong> Vänligen betala fakturan senast förfallodatumet för att undvika dröjsmålsränta.</p>
            
            <p>Med vänliga hälsningar,<br>
            Gröngräset Samfällighetsförening</p>
          </div>
          
          <div class="footer">
            <p>Detta är ett automatiskt meddelande. Svara inte på detta email.</p>
            <p>För frågor, kontakta styrelsen eller logga in på systemet.</p>
          </div>
        </body>
      </html>
    `,
    textContent: `
Gröngräset Samfällighetsförening - Ny Faktura

Hej {{ownerName}},

En ny faktura är nu tillgänglig för ditt hushåll ({{householdNumber}}) för faktureringsperioden {{billingPeriod}}.

Faktura Detaljer:
- Fakturanummer: {{invoiceNumber}}
- Period: {{billingPeriod}}
- Förfallodatum: {{dueDate}}
- Total summa: {{totalAmount}} SEK

Du kan logga in i vårt system för att se den detaljerade fakturaspecifikationen och hantera din betalning.

Logga in: {{loginUrl}}

Viktigt: Vänligen betala fakturan senast förfallodatumet för att undvika dröjsmålsränta.

Med vänliga hälsningar,
Gröngräset Samfällighetsförening

---
Detta är ett automatiskt meddelande. Svara inte på detta email.
För frågor, kontakta styrelsen eller logga in på systemet.
    `,
    variables: [
      "ownerName",
      "householdNumber",
      "billingPeriod",
      "invoiceNumber",
      "dueDate",
      "totalAmount",
      "loginUrl",
    ],
  },

  paymentReminder: {
    name: "payment_reminder",
    subject: "Påminnelse: Obetald faktura från Gröngräset - {{invoiceNumber}}",
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .invoice-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #FF9800; }
            .amount { font-size: 24px; font-weight: bold; color: #FF9800; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #FF9800; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gröngräset Samfällighetsförening</h1>
            <h2>⚠️ Betalningspåminnelse</h2>
          </div>
          
          <div class="content">
            <p>Hej {{ownerName}},</p>
            
            <p>Vi har noterat att följande faktura för ditt hushåll ({{householdNumber}}) fortfarande är obetald:</p>
            
            <div class="invoice-details">
              <h3>Obetald Faktura</h3>
              <p><strong>Fakturanummer:</strong> {{invoiceNumber}}</p>
              <p><strong>Period:</strong> {{billingPeriod}}</p>
              <p><strong>Förfallodatum:</strong> {{dueDate}}</p>
              <p><strong>Dagar sen:</strong> {{daysOverdue}}</p>
              <p><strong>Skuld:</strong> <span class="amount">{{totalAmount}} SEK</span></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Viktigt:</strong> Vänligen betala denna faktura snarast möjligt för att undvika dröjsmålsränta och inkassoavgifter.
            </div>
            
            <div style="text-align: center;">
              <a href="{{loginUrl}}" class="button">Logga In för Att Betala</a>
            </div>
            
            <p>Om du redan har betalat denna faktura, vänligen ignorera detta meddelande eller kontakta oss för att uppdatera betalningsstatus.</p>
            
            <p>Med vänliga hälsningar,<br>
            Gröngräset Samfällighetsförening</p>
          </div>
          
          <div class="footer">
            <p>Detta är ett automatiskt meddelande. Svara inte på detta email.</p>
            <p>För frågor om betalningar, kontakta styrelsen.</p>
          </div>
        </body>
      </html>
    `,
    textContent: `
Gröngräset Samfällighetsförening - Betalningspåminnelse

Hej {{ownerName}},

Vi har noterat att följande faktura för ditt hushåll ({{householdNumber}}) fortfarande är obetald:

Obetald Faktura:
- Fakturanummer: {{invoiceNumber}}
- Period: {{billingPeriod}}
- Förfallodatum: {{dueDate}}
- Dagar sen: {{daysOverdue}}
- Skuld: {{totalAmount}} SEK

⚠️ Viktigt: Vänligen betala denna faktura snarast möjligt för att undvika dröjsmålsränta och inkassoavgifter.

Logga in för att betala: {{loginUrl}}

Om du redan har betalat denna faktura, vänligen ignorera detta meddelande eller kontakta oss för att uppdatera betalningsstatus.

Med vänliga hälsningar,
Gröngräset Samfällighetsförening

---
Detta är ett automatiskt meddelande. Svara inte på detta email.
För frågor om betalningar, kontakta styrelsen.
    `,
    variables: [
      "ownerName",
      "householdNumber",
      "invoiceNumber",
      "billingPeriod",
      "dueDate",
      "daysOverdue",
      "totalAmount",
      "loginUrl",
    ],
  },

  paymentConfirmation: {
    name: "payment_confirmation",
    subject: "Betalning mottagen - Tack! {{invoiceNumber}}",
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .payment-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4CAF50; }
            .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gröngräset Samfällighetsförening</h1>
            <h2>✅ Betalning Mottagen</h2>
          </div>
          
          <div class="content">
            <p>Hej {{ownerName}},</p>
            
            <div class="success">
              <strong>✅ Tack för din betalning!</strong> Vi har registrerat att din faktura nu är betald.
            </div>
            
            <div class="payment-details">
              <h3>Betalningsinformation</h3>
              <p><strong>Fakturanummer:</strong> {{invoiceNumber}}</p>
              <p><strong>Period:</strong> {{billingPeriod}}</p>
              <p><strong>Betalt belopp:</strong> <span class="amount">{{totalAmount}} SEK</span></p>
              <p><strong>Betalningsdatum:</strong> {{paymentDate}}</p>
              <p><strong>Hushåll:</strong> {{householdNumber}}</p>
            </div>
            
            <p>Din betalning har registrerats i vårt system och fakturan är nu markerad som betald.</p>
            
            <p>Du kan när som helst logga in på vårt system för att se alla dina fakturor och betalningar.</p>
            
            <p>Tack för att du bidrar till vår samfällighetsförening!</p>
            
            <p>Med vänliga hälsningar,<br>
            Gröngräset Samfällighetsförening</p>
          </div>
          
          <div class="footer">
            <p>Detta är ett automatiskt meddelande. Svara inte på detta email.</p>
            <p>För frågor, kontakta styrelsen eller logga in på systemet.</p>
          </div>
        </body>
      </html>
    `,
    textContent: `
Gröngräset Samfällighetsförening - Betalning Mottagen

Hej {{ownerName}},

✅ Tack för din betalning! Vi har registrerat att din faktura nu är betald.

Betalningsinformation:
- Fakturanummer: {{invoiceNumber}}
- Period: {{billingPeriod}}
- Betalt belopp: {{totalAmount}} SEK
- Betalningsdatum: {{paymentDate}}
- Hushåll: {{householdNumber}}

Din betalning har registrerats i vårt system och fakturan är nu markerad som betald.

Du kan när som helst logga in på vårt system för att se alla dina fakturor och betalningar.

Tack för att du bidrar till vår samfällighetsförening!

Med vänliga hälsningar,
Gröngräset Samfällighetsförening

---
Detta är ett automatiskt meddelande. Svara inte på detta email.
För frågor, kontakta styrelsen eller logga in på systemet.
    `,
    variables: [
      "ownerName",
      "householdNumber",
      "invoiceNumber",
      "billingPeriod",
      "totalAmount",
      "paymentDate",
    ],
  },

  welcomeEmail: {
    name: "welcome_email",
    subject: "Välkommen till Gröngräset - Ditt konto är aktiverat",
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .welcome-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4CAF50; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4CAF50; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gröngräset Samfällighetsförening</h1>
            <h2>🏡 Välkommen!</h2>
          </div>
          
          <div class="content">
            <p>Hej {{ownerName}},</p>
            
            <div class="welcome-box">
              <h3>Välkommen till Gröngräsets faktureringssystem!</h3>
              <p>Ditt konto har nu aktiverats för hushåll <strong>{{householdNumber}}</strong>.</p>
            </div>
            
            <p>Via vårt online-system kan du:</p>
            <ul>
              <li>📋 Se alla dina fakturor och betalningar</li>
              <li>📊 Granska din konsumtion av el, vatten och värme</li>
              <li>📈 Jämföra din förbrukning över tid</li>
              <li>💰 Markera fakturor som betalda</li>
              <li>📧 Uppdatera dina kontaktuppgifter</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="{{loginUrl}}" class="button">Logga In Nu</a>
            </div>
            
            <p><strong>Dina inloggningsuppgifter:</strong></p>
            <p>Email: {{email}}<br>
            Lösenord: Det lösenord du angav vid registrering</p>
            
            <p>Om du har glömt ditt lösenord kan du återställa det via inloggningssidan.</p>
            
            <p>Har du frågor? Kontakta styrelsen så hjälper vi dig komma igång!</p>
            
            <p>Med vänliga hälsningar,<br>
            Gröngräset Samfällighetsförening</p>
          </div>
          
          <div class="footer">
            <p>Detta är ett automatiskt meddelande. Svara inte på detta email.</p>
            <p>För teknisk support, kontakta systemadministratören.</p>
          </div>
        </body>
      </html>
    `,
    textContent: `
Gröngräset Samfällighetsförening - Välkommen!

Hej {{ownerName}},

Välkommen till Gröngräsets faktureringssystem!
Ditt konto har nu aktiverats för hushåll {{householdNumber}}.

Via vårt online-system kan du:
- Se alla dina fakturor och betalningar
- Granska din konsumtion av el, vatten och värme
- Jämföra din förbrukning över tid
- Markera fakturor som betalda
- Uppdatera dina kontaktuppgifter

Dina inloggningsuppgifter:
Email: {{email}}
Lösenord: Det lösenord du angav vid registrering

Logga in: {{loginUrl}}

Om du har glömt ditt lösenord kan du återställa det via inloggningssidan.

Har du frågor? Kontakta styrelsen så hjälper vi dig komma igång!

Med vänliga hälsningar,
Gröngräset Samfällighetsförening

---
Detta är ett automatiskt meddelande. Svara inte på detta email.
För teknisk support, kontakta systemadministratören.
    `,
    variables: ["ownerName", "householdNumber", "email", "loginUrl"],
  },

  systemNotification: {
    name: "system_notification",
    subject: "Systemmeddelande från Gröngräset: {{notificationTitle}}",
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .notification-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2196F3; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gröngräset Samfällighetsförening</h1>
            <h2>📢 Systemmeddelande</h2>
          </div>
          
          <div class="content">
            <p>Hej {{ownerName}},</p>
            
            <div class="notification-box">
              <h3>{{notificationTitle}}</h3>
              <div>{{notificationContent}}</div>
            </div>
            
            <p>Detta meddelande skickades {{sentDate}}.</p>
            
            <p>Med vänliga hälsningar,<br>
            Gröngräset Samfällighetsförening</p>
          </div>
          
          <div class="footer">
            <p>Detta är ett automatiskt meddelande. Svara inte på detta email.</p>
            <p>För frågor, kontakta styrelsen.</p>
          </div>
        </body>
      </html>
    `,
    textContent: `
Gröngräset Samfällighetsförening - Systemmeddelande

Hej {{ownerName}},

{{notificationTitle}}

{{notificationContent}}

Detta meddelande skickades {{sentDate}}.

Med vänliga hälsningar,
Gröngräset Samfällighetsförening

---
Detta är ett automatiskt meddelande. Svara inte på detta email.
För frågor, kontakta styrelsen.
    `,
    variables: [
      "ownerName",
      "notificationTitle",
      "notificationContent",
      "sentDate",
    ],
  },
};

/**
 * Initialize default email templates in the database
 */
export async function initializeEmailTemplates(): Promise<void> {
  console.log("Initializing email templates...");

  for (const template of Object.values(emailTemplates)) {
    try {
      await emailService.createTemplate(template);
      console.log(`✅ Template '${template.name}' created/updated`);
    } catch (error) {
      console.error(`❌ Failed to create template '${template.name}':`, error);
    }
  }

  console.log("Email templates initialization complete");
}
