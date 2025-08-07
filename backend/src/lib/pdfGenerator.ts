import puppeteer, { Browser } from "puppeteer";
import path from "path";
import { prisma } from "./prisma";

export interface BillData {
  id: string;
  billNumber: string;
  householdNumber: number;
  householdOwner: string;
  householdAddress: string;
  billingPeriodName: string;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  memberFee: number;
  totalUtilityCosts: number;
  sharedCosts: number;
  totalAmount: number;
  status: string;
  utilityBillings: Array<{
    serviceName: string;
    serviceType: string;
    consumption: number;
    unit: string;
    pricePerUnit: number;
    fixedFee: number;
    variableCost: number;
    totalCost: number;
    meterReading: number;
    previousReading: number;
  }>;
}

export class PDFGenerator {
  private static browser: Browser | null = null;

  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-default-apps",
          "--no-default-browser-check",
          "--no-first-run",
          "--disable-translate",
          "--disable-sync",
          "--hide-scrollbars",
          "--mute-audio",
        ],
        executablePath: process.env.CHROME_BIN || undefined,
        ignoreDefaultArgs: ["--disable-extensions"],
      });
    }
    return this.browser;
  }

  public static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate PDF invoice for a quarterly bill
   */
  public static async generateQuarterlyBillPDF(
    billId: string
  ): Promise<Buffer> {
    try {
      // Fetch bill data with all relations
      const bill = await prisma.quarterlyBill.findUnique({
        where: { id: billId },
        include: {
          household: true,
          billingPeriod: true,
        },
      });

      if (!bill) {
        throw new Error("Quarterly bill not found");
      }

      // Get detailed utility billing breakdown
      const utilityBillings = await prisma.utilityBilling.findMany({
        where: {
          householdId: bill.householdId,
          billingPeriodId: bill.billingPeriodId,
        },
        include: {
          service: true,
        },
        orderBy: {
          service: { serviceType: "asc" },
        },
      });

      // Format data for template
      const billData: BillData = {
        id: bill.id,
        billNumber: this.generateBillNumber(bill),
        householdNumber: bill.household.householdNumber,
        householdOwner: bill.household.ownerName,
        householdAddress: bill.household.address || "Gröngräset",
        billingPeriodName: bill.billingPeriod.periodName,
        startDate: bill.billingPeriod.startDate,
        endDate: bill.billingPeriod.endDate,
        dueDate: bill.dueDate,
        memberFee: Number(bill.memberFee),
        totalUtilityCosts: Number(bill.totalUtilityCosts),
        sharedCosts: Number(bill.sharedCosts),
        totalAmount: Number(bill.totalAmount),
        status: bill.status,
        utilityBillings: utilityBillings.map((ub) => ({
          serviceName: ub.service.name,
          serviceType: ub.service.serviceType,
          consumption: Number(ub.consumption),
          unit: ub.service.unit,
          pricePerUnit: Number(ub.costPerUnit),
          fixedFee: Number(ub.fixedCost),
          variableCost: Number(ub.consumptionCost),
          totalCost: Number(ub.totalUtilityCost),
          meterReading: Number(ub.consumption), // Using consumption as meter reading
          previousReading: 0, // Simplified - not calculated anymore
        })),
      };

      return await this.generatePDF(billData, "quarterly");
    } catch (error) {
      console.error("Error generating quarterly bill PDF:", error);
      throw error;
    }
  }

  /**
   * Generate PDF invoice for a monthly bill
   */
  public static async generateMonthlyBillPDF(billId: string): Promise<Buffer> {
    try {
      // Fetch bill data with all relations
      const bill = await prisma.monthlyBill.findUnique({
        where: { id: billId },
        include: {
          household: true,
          billingPeriod: true,
        },
      });

      if (!bill) {
        throw new Error("Monthly bill not found");
      }

      // Get detailed utility billing breakdown
      const utilityBillings = await prisma.utilityBilling.findMany({
        where: {
          householdId: bill.householdId,
          billingPeriodId: bill.billingPeriodId,
        },
        include: {
          service: true,
        },
        orderBy: {
          service: { serviceType: "asc" },
        },
      });

      // Format data for template
      const billData: BillData = {
        id: bill.id,
        billNumber: this.generateBillNumber(bill),
        householdNumber: bill.household.householdNumber,
        householdOwner: bill.household.ownerName,
        householdAddress: bill.household.address || "Gröngräset",
        billingPeriodName: bill.billingPeriod.periodName,
        startDate: bill.billingPeriod.startDate,
        endDate: bill.billingPeriod.endDate,
        dueDate: bill.dueDate,
        memberFee: 0, // Monthly bills don't include member fees
        totalUtilityCosts: Number(bill.totalUtilityCosts),
        sharedCosts: 0, // Monthly bills don't include shared costs
        totalAmount: Number(bill.totalAmount),
        status: bill.status,
        utilityBillings: utilityBillings.map((ub) => ({
          serviceName: ub.service.name,
          serviceType: ub.service.serviceType,
          consumption: Number(ub.consumption),
          unit: ub.service.unit,
          pricePerUnit: Number(ub.costPerUnit),
          fixedFee: Number(ub.fixedCost),
          variableCost: Number(ub.consumptionCost),
          totalCost: Number(ub.totalUtilityCost),
          meterReading: Number(ub.consumption), // Using consumption as meter reading
          previousReading: 0, // Simplified - not calculated anymore
        })),
      };

      return await this.generatePDF(billData, "monthly");
    } catch (error) {
      console.error("Error generating monthly bill PDF:", error);
      throw error;
    }
  }

  /**
   * Generate the actual PDF using Puppeteer
   */
  private static async generatePDF(
    billData: BillData,
    billType: "quarterly" | "monthly"
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Generate HTML content
      const htmlContent = this.generateInvoiceHTML(billData, billType);

      // Set page content
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // Generate PDF
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "1cm",
          right: "1cm",
          bottom: "1cm",
          left: "1cm",
        },
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate HTML template for invoice
   */
  private static generateInvoiceHTML(
    billData: BillData,
    billType: "quarterly" | "monthly"
  ): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("sv-SE", {
        style: "currency",
        currency: "SEK",
      }).format(amount);

    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat("sv-SE").format(new Date(date));

    return `
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faktura - ${billData.billNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: #fff;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #2e7d32;
            padding-bottom: 20px;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo-section h1 {
            color: #2e7d32;
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .logo-section p {
            color: #666;
            font-size: 14px;
        }
        
        .invoice-details {
            text-align: right;
            flex: 1;
        }
        
        .invoice-details h2 {
            color: #2e7d32;
            font-size: 20px;
            margin-bottom: 10px;
        }
        
        .invoice-details p {
            margin-bottom: 5px;
        }
        
        .billing-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .billing-section {
            flex: 1;
            margin-right: 20px;
        }
        
        .billing-section:last-child {
            margin-right: 0;
        }
        
        .billing-section h3 {
            color: #2e7d32;
            font-size: 14px;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        
        .billing-section p {
            margin-bottom: 5px;
        }
        
        .charges-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .charges-table th {
            background-color: #2e7d32;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #2e7d32;
        }
        
        .charges-table td {
            padding: 10px 8px;
            border: 1px solid #ddd;
            text-align: left;
        }
        
        .charges-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .charges-table tr:hover {
            background-color: #f5f5f5;
        }
        
        .amount {
            text-align: right;
            font-weight: bold;
        }
        
        .summary-table {
            width: 100%;
            max-width: 400px;
            margin-left: auto;
            margin-bottom: 30px;
            border-collapse: collapse;
        }
        
        .summary-table td {
            padding: 8px 12px;
            border: 1px solid #ddd;
        }
        
        .summary-table .label {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: right;
        }
        
        .summary-table .total-row {
            background-color: #2e7d32;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        
        .payment-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #2e7d32;
        }
        
        .payment-info h3 {
            color: #2e7d32;
            margin-bottom: 10px;
        }
        
        .footer {
            border-top: 1px solid #ddd;
            padding-top: 20px;
            text-align: center;
            color: #666;
            font-size: 11px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-pending {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .status-paid {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status-overdue {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        @media print {
            .invoice-container {
                max-width: none;
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <h1>Gröngräset</h1>
                <p>Samfällighetsförening</p>
                <p>Orgisationsnummer: 123456-7890</p>
                <p>info@grongraset.se</p>
            </div>
            <div class="invoice-details">
                <h2>FAKTURA</h2>
                <p><strong>Fakturanummer:</strong> ${billData.billNumber}</p>
                <p><strong>Fakturadatum:</strong> ${formatDate(new Date())}</p>
                <p><strong>Förfallodag:</strong> ${formatDate(
                  billData.dueDate
                )}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${
                  billData.status
                }">${
      billData.status === "paid"
        ? "Betald"
        : billData.status === "pending"
        ? "Väntande"
        : "Förfallen"
    }</span></p>
            </div>
        </div>
        
        <!-- Billing Info -->
        <div class="billing-info">
            <div class="billing-section">
                <h3>Faktureringsadress</h3>
                <p><strong>${billData.householdOwner}</strong></p>
                <p>Hushåll ${billData.householdNumber}</p>
                <p>${billData.householdAddress}</p>
            </div>
            <div class="billing-section">
                <h3>Faktureringsperiod</h3>
                <p><strong>${billData.billingPeriodName}</strong></p>
                <p>${formatDate(billData.startDate)} - ${formatDate(
      billData.endDate
    )}</p>
                <p><strong>Typ:</strong> ${
                  billType === "quarterly"
                    ? "Kvartalsdebitering"
                    : "Månadsdebitering"
                }</p>
            </div>
        </div>
        
        <!-- Charges Table -->
        ${
          billData.utilityBillings.length > 0
            ? `
        <table class="charges-table">
            <thead>
                <tr>
                    <th>Tjänst</th>
                    <th>Förbrukning</th>
                    <th>Enhet</th>
                    <th>Pris/enhet</th>
                    <th>Rörlig kostnad</th>
                    <th>Fast avgift</th>
                    <th class="amount">Totalt</th>
                </tr>
            </thead>
            <tbody>
                ${billData.utilityBillings
                  .map(
                    (utility) => `
                <tr>
                    <td>
                        <strong>${utility.serviceName}</strong>
                        ${
                          utility.meterReading
                            ? `<br><small>Mätarställning: ${utility.previousReading} → ${utility.meterReading}</small>`
                            : ""
                        }
                    </td>
                    <td>${utility.consumption.toFixed(2)}</td>
                    <td>${utility.unit}</td>
                    <td class="amount">${formatCurrency(
                      utility.pricePerUnit
                    )}</td>
                    <td class="amount">${formatCurrency(
                      utility.variableCost
                    )}</td>
                    <td class="amount">${formatCurrency(utility.fixedFee)}</td>
                    <td class="amount">${formatCurrency(utility.totalCost)}</td>
                </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
        `
            : ""
        }
        
        <!-- Summary -->
        <table class="summary-table">
            ${
              billData.utilityBillings.length > 0
                ? `
            <tr>
                <td class="label">Summa VA/El/Värme:</td>
                <td class="amount">${formatCurrency(
                  billData.totalUtilityCosts
                )}</td>
            </tr>
            `
                : ""
            }
            ${
              billType === "quarterly" && billData.memberFee > 0
                ? `
            <tr>
                <td class="label">Medlemsavgift:</td>
                <td class="amount">${formatCurrency(billData.memberFee)}</td>
            </tr>
            `
                : ""
            }
            ${
              billType === "quarterly" && billData.sharedCosts > 0
                ? `
            <tr>
                <td class="label">Gemensamma kostnader:</td>
                <td class="amount">${formatCurrency(billData.sharedCosts)}</td>
            </tr>
            `
                : ""
            }
            <tr class="total-row">
                <td class="label">TOTALT ATT BETALA:</td>
                <td class="amount">${formatCurrency(billData.totalAmount)}</td>
            </tr>
        </table>
        
        <!-- Payment Info -->
        <div class="payment-info">
            <h3>Betalningsinformation</h3>
            <p><strong>Plusgiro:</strong> 97 49 44-1</p>
            <!-- <p><strong>Swish:</strong> 123 456 78 90</p> -->
            <p><strong>Meddelande:</strong> ${billData.billNumber} - Hushåll ${
      billData.householdNumber
    }</p>
            <p><strong>Förfallodag:</strong> ${formatDate(billData.dueDate)}</p>
            <p><em>Vänligen använd fakturanumret som meddelande vid betalning.</em></p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Gröngräset Samfällighetsförening - Genererad ${formatDate(
              new Date()
            )} | ${billData.billNumber}</p>
            <p>För frågor kontakta ekonomiansvarig på ekonomi@grongraset.se</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate bill number based on bill data
   */
  private static generateBillNumber(bill: any): string {
    const year = new Date(bill.createdAt || new Date()).getFullYear();
    const month = new Date(bill.createdAt || new Date()).getMonth() + 1;
    const householdNumber = bill.household.householdNumber
      .toString()
      .padStart(2, "0");
    const billId = bill.id.substring(0, 8).toUpperCase();

    return `${year}${month
      .toString()
      .padStart(2, "0")}-${householdNumber}-${billId}`;
  }

  /**
   * Helper function to expand utility billings into separate rows for display
   * This creates separate rows for variable cost, fixed cost, and reconciliation adjustments
   */
  private static expandUtilityBillingsForDisplay(
    utilityBillings: BillData["utilityBillings"]
  ) {
    const expandedRows: Array<{
      serviceName: string;
      description: string;
      quantity: number;
      unit: string;
      pricePerUnit: number;
      variableCost: number;
      fixedCost: number;
      totalCost: number;
      isReconciliation?: boolean;
    }> = [];

    utilityBillings.forEach((utility) => {
      if (utility.serviceType === "WATER") {
        // Water - Variable cost (consumption)
        expandedRows.push({
          serviceName: `${utility.serviceName} - Rörlig kostnad`,
          description: `Vattenförbrukning: ${utility.consumption.toFixed(1)} ${
            utility.unit
          }`,
          quantity: utility.consumption,
          unit: utility.unit,
          pricePerUnit: utility.pricePerUnit,
          variableCost: utility.variableCost,
          fixedCost: 0,
          totalCost: utility.variableCost,
        });

        // Water - Fixed cost
        expandedRows.push({
          serviceName: `${utility.serviceName} - Fast avgift`,
          description: "Kvartalsavgift för vattenförsörjning",
          quantity: 1,
          unit: "st",
          pricePerUnit: utility.fixedFee,
          variableCost: 0,
          fixedCost: utility.fixedFee,
          totalCost: utility.fixedFee,
        });

        // Reconciliation adjustments are now handled as separate records in the database
        // No need for separate handling here anymore
      } else {
        // Other services (membership, etc.) - keep as single row
        expandedRows.push({
          serviceName: utility.serviceName,
          description:
            utility.serviceType === "MEMBERSHIP"
              ? "Kvartalsmässig medlemsavgift för samfällighetsföreningen"
              : "",
          quantity:
            utility.serviceType === "MEMBERSHIP" ? 1 : utility.consumption,
          unit: utility.serviceType === "MEMBERSHIP" ? "st" : utility.unit,
          pricePerUnit:
            utility.serviceType === "MEMBERSHIP"
              ? utility.fixedFee
              : utility.pricePerUnit,
          variableCost:
            utility.serviceType === "MEMBERSHIP" ? 0 : utility.variableCost,
          fixedCost:
            utility.serviceType === "MEMBERSHIP"
              ? utility.fixedFee
              : utility.fixedFee,
          totalCost: utility.totalCost,
        });
      }
    });

    return expandedRows;
  }
}
