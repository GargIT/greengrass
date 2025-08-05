import { PDFGenerator } from "./src/lib/pdfGenerator";
import { prisma } from "./src/lib/prisma";

async function testPDFGeneration() {
  console.log("🧪 Testing PDF generation...");

  try {
    // Find the first quarterly bill
    const firstBill = await prisma.quarterlyBill.findFirst({
      include: {
        household: true,
        billingPeriod: true,
      },
    });

    if (!firstBill) {
      console.log("❌ No quarterly bills found in database");
      return;
    }

    console.log(
      `✅ Found bill for household ${firstBill.household.householdNumber}`
    );
    console.log(`   Period: ${firstBill.billingPeriod.periodName}`);
    console.log(`   Amount: ${firstBill.totalAmount} SEK`);

    // Try to generate PDF
    console.log("🎯 Generating PDF...");
    const pdfBuffer = await PDFGenerator.generateQuarterlyBillPDF(firstBill.id);

    console.log(
      `✅ PDF generated successfully! Size: ${pdfBuffer.length} bytes`
    );

    // Clean up browser
    await PDFGenerator.closeBrowser();
    console.log("🧹 Browser closed");
  } catch (error) {
    console.error("❌ PDF generation failed:", error);
    await PDFGenerator.closeBrowser();
  } finally {
    await prisma.$disconnect();
  }
}

testPDFGeneration().catch(console.error);
