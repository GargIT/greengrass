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
            
            <p>En ny faktura har skapats för ditt hushåll ({{householdNumber}}) för perioden <strong>{{periodName}}</strong>.</p>
            
            <div class="invoice-details">
              <h3>Faktura Detaljer</h3>
              <p><strong>Fakturanummer:</strong> {{invoiceNumber}}</p>
              <p><strong>Period:</strong> {{periodName}}</p>
              <p><strong>Förfallodatum:</strong> {{dueDate}}</p>
              <p><strong>Total summa:</strong> <span class="amount">{{totalAmount}} SEK</span></p>
            </div>
            
            <p>Du kan logga in på vårt system för att se detaljerad fakturabeskrivning och hantera betalning.</p>
            
            <div style="text-align: center;">
              <a href="{{loginUrl}}" class="button">Logga In för Att Se Faktura</a>
            </div>
            
            <p><strong>Viktigt:</strong> Vänligen betala fakturan innan förfallodatumet för att undvika förseningsavgifter.</p>
            
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

En ny faktura har skapats för ditt hushåll ({{householdNumber}}) för perioden {{periodName}}.

Faktura Detaljer:
- Fakturanummer: {{invoiceNumber}}
- Period: {{periodName}}
- Förfallodatum: {{dueDate}}
- Total summa: {{totalAmount}} SEK

Du kan logga in på vårt system för att se detaljerad fakturabeskrivning och hantera betalning.

Logga in: {{loginUrl}}

Viktigt: Vänligen betala fakturan innan förfallodatumet för att undvika förseningsavgifter.

Med vänliga hälsningar,
Gröngräset Samfällighetsförening

---
Detta är ett automatiskt meddelande. Svara inte på detta email.
För frågor, kontakta styrelsen eller logga in på systemet.
    `,
    variables: [
      "ownerName",
      "householdNumber",
      "periodName",
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
            
            <p>Vi har upptäckt att följande faktura för ditt hushåll ({{householdNumber}}) fortfarande är obetald:</p>
            
            <div class="invoice-details">
              <h3>Obetald Faktura</h3>
              <p><strong>Fakturanummer:</strong> {{invoiceNumber}}</p>
              <p><strong>Period:</strong> {{periodName}}</p>
              <p><strong>Förfallodatum:</strong> {{dueDate}}</p>
              <p><strong>Dagar sen:</strong> {{daysOverdue}}</p>
              <p><strong>Skuld:</strong> <span class="amount">{{totalAmount}} SEK</span></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Viktigt:</strong> Vänligen betala denna faktura så snart som möjligt för att undvika ytterligare förseningsavgifter.
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

Vi har upptäckt att följande faktura för ditt hushåll ({{householdNumber}}) fortfarande är obetald:

Obetald Faktura:
- Fakturanummer: {{invoiceNumber}}
- Period: {{periodName}}
- Förfallodatum: {{dueDate}}
- Dagar sen: {{daysOverdue}}
- Skuld: {{totalAmount}} SEK

⚠️ Viktigt: Vänligen betala denna faktura så snart som möjligt för att undvika ytterligare förseningsavgifter.

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
      "periodName",
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
              <p><strong>Period:</strong> {{periodName}}</p>
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
- Period: {{periodName}}
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
      "periodName",
      "totalAmount",
      "paymentDate",
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
