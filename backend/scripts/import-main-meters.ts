import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { join } from "path";

const prisma = new PrismaClient();

async function importMainMeterReadings() {
  console.log(
    "📊 Importing main meter readings from 'Huvud mätare' sheet...\n"
  );

  try {
    // Read Excel file
    const excelPath = join(process.cwd(), "../Gröngräset.xlsx");
    const workbook = XLSX.readFile(excelPath);

    // Get the main meter sheet
    const mainMeterSheet = workbook.Sheets["Huvud mätare"];
    if (!mainMeterSheet) {
      console.log("❌ 'Huvud mätare' sheet not found");
      return;
    }

    // Convert to array
    const sheetData = XLSX.utils.sheet_to_json(mainMeterSheet, { header: 1 });
    console.log(`📋 Sheet has ${sheetData.length} rows`);

    // Find existing main meters
    const mainMeters = await prisma.mainMeter.findMany({
      orderBy: { meterIdentifier: "asc" },
    });

    if (mainMeters.length < 2) {
      console.log("❌ Expected 2 main meters, found:", mainMeters.length);
      return;
    }

    const meter1 = mainMeters[0]; // Huvudmätare 1
    const meter2 = mainMeters[1]; // Huvudmätare 2

    console.log(
      `✅ Found meters: ${meter1.meterIdentifier} and ${meter2.meterIdentifier}`
    );

    let readingsImported = 0;

    // Process data rows (skip headers, start from row with actual data)
    // Looking at the analyze output, actual data starts around row 5 (index 4)
    for (let i = 4; i < sheetData.length; i++) {
      const row = sheetData[i] as any[];
      if (!row || row.length < 7) continue;

      // Check if this looks like a data row (first column should be Excel date)
      if (typeof row[0] !== "number") continue;

      try {
        // Parse date
        const excelDate = row[0];
        const readingDate = new Date((excelDate - 25569) * 86400 * 1000);

        // Skip invalid dates
        if (!readingDate || isNaN(readingDate.getTime())) {
          console.log(`   ⚠️  Invalid date in row ${i + 1}:`, row[0]);
          continue;
        }

        // Parse meter readings
        const meter1Reading =
          typeof row[1] === "number" ? row[1] : parseFloat(row[1]);
        const meter2Reading =
          typeof row[4] === "number" ? row[4] : parseFloat(row[4]);

        // Skip if readings are invalid (but don't log for undefined values)
        if (isNaN(meter1Reading) || isNaN(meter2Reading)) {
          if (row[1] !== undefined && row[4] !== undefined) {
            console.log(
              `   ⚠️  Invalid readings in row ${i + 1}:`,
              row[1],
              row[4]
            );
          }
          continue;
        }

        // Parse consumption if available
        const meter1Consumption = typeof row[3] === "number" ? row[3] : null;
        const meter2Consumption = typeof row[6] === "number" ? row[6] : null;

        // Create/find billing period
        const periodName = readingDate.toISOString().split("T")[0];
        let billingPeriod = await prisma.billingPeriod.findFirst({
          where: { periodName },
        });

        if (!billingPeriod) {
          billingPeriod = await prisma.billingPeriod.create({
            data: {
              periodName,
              periodType: "quarterly",
              startDate: readingDate,
              endDate: readingDate,
              readingDeadline: readingDate,
              isOfficialBilling: true,
              isBillingEnabled: true,
            },
          });
          console.log(`   📅 Created billing period: ${periodName}`);
        }

        // Create meter reading for Meter 1
        try {
          await prisma.mainMeterReading.create({
            data: {
              meterId: meter1.id,
              billingPeriodId: billingPeriod.id,
              meterReading: meter1Reading,
              readingDate,
              consumption: meter1Consumption,
            },
          });
          readingsImported++;
        } catch (error) {
          // Probably duplicate, skip
          console.log(
            `   ⚠️  Skipping duplicate reading for ${meter1.meterIdentifier} on ${periodName}`
          );
        }

        // Create meter reading for Meter 2
        try {
          await prisma.mainMeterReading.create({
            data: {
              meterId: meter2.id,
              billingPeriodId: billingPeriod.id,
              meterReading: meter2Reading,
              readingDate,
              consumption: meter2Consumption,
            },
          });
          readingsImported++;
        } catch (error) {
          // Probably duplicate, skip
          console.log(
            `   ⚠️  Skipping duplicate reading for ${meter2.meterIdentifier} on ${periodName}`
          );
        }

        if (readingsImported <= 10) {
          console.log(
            `   ✅ ${periodName}: Meter1=${meter1Reading}m³, Meter2=${meter2Reading}m³`
          );
        }
      } catch (error) {
        console.log(`   ⚠️  Error processing row ${i + 1}:`, error);
      }
    }

    console.log(`\n✅ Import completed!`);
    console.log(`📊 Summary:`);
    console.log(`  • Main meter readings imported: ${readingsImported}`);
    console.log(`  • Expected: ~${sheetData.length - 4} readings per meter`);

    // Verify counts
    const meter1Count = await prisma.mainMeterReading.count({
      where: { meterId: meter1.id },
    });
    const meter2Count = await prisma.mainMeterReading.count({
      where: { meterId: meter2.id },
    });

    console.log(`\n📈 Final counts:`);
    console.log(`  • ${meter1.meterIdentifier}: ${meter1Count} readings`);
    console.log(`  • ${meter2.meterIdentifier}: ${meter2Count} readings`);
  } catch (error) {
    console.error("❌ Error importing main meter readings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

importMainMeterReadings();
