import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { join } from "path";

const prisma = new PrismaClient();

async function importExcelData() {
  console.log("📥 Importing Gröngräset Excel data...");
  console.log("Focus: 'Huvud mätare' + 'Gräsv.6-32' sheets (no loans)");

  try {
    // Read Excel file
    const excelPath = join(process.cwd(), "../Gröngräset.xlsx");
    console.log(`Reading from: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);

    // Step 1: Create Water utility service
    console.log("\n💧 Creating Water utility service...");
    const waterService = await prisma.utilityService.create({
      data: {
        name: "Vatten",
        unit: "m³",
        isActive: true,
      },
    });
    console.log(`✅ Created: ${waterService.name}`);

    // Step 2: Import main meters from "Huvud mätare" sheet
    console.log("\n📊 Processing 'Huvud mätare' sheet...");
    const mainMeterSheet = workbook.Sheets["Huvud mätare"];

    if (mainMeterSheet) {
      const mainMeterData = XLSX.utils.sheet_to_json(mainMeterSheet, {
        header: 1,
      });
      console.log(`Found ${mainMeterData.length} rows in main meter sheet`);

      // Show structure
      console.log("First 5 rows:", mainMeterData.slice(0, 5));

      // Create 2 main meters for water (based on previous analysis)
      const mainMeter1 = await prisma.mainMeter.create({
        data: {
          serviceId: waterService.id,
          meterIdentifier: "Huvudmätare 1",
          meterSerial: "HUV-001",
          isActive: true,
        },
      });

      const mainMeter2 = await prisma.mainMeter.create({
        data: {
          serviceId: waterService.id,
          meterIdentifier: "Huvudmätare 2",
          meterSerial: "HUV-002",
          isActive: true,
        },
      });

      console.log(
        `✅ Created main meters: ${mainMeter1.meterIdentifier}, ${mainMeter2.meterIdentifier}`
      );
    } else {
      console.log("❌ 'Huvud mätare' sheet not found");
    }

    // Step 3: Import households from Gräsv sheets
    console.log("\n🏠 Processing household sheets (Gräsv.6-32)...");
    const houseNumbers = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];
    let totalReadingsImported = 0;

    for (const houseNum of houseNumbers) {
      const sheetName = `Gräsv.${houseNum}`;
      console.log(`\n--- Processing ${sheetName} ---`);

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        console.log(`❌ Sheet ${sheetName} not found`);
        continue;
      }

      // Create household
      const household = await prisma.household.create({
        data: {
          householdNumber: houseNum,
          ownerName: `Gräsvägen ${houseNum}`, // Placeholder name
          address: `Gräsvägen ${houseNum}`,
          isActive: true,
        },
      });

      // Create household meter for water
      const householdMeter = await prisma.householdMeter.create({
        data: {
          householdId: household.id,
          serviceId: waterService.id,
          meterSerial: `VAT-${houseNum}`,
          isActive: true,
        },
      });

      console.log(`✅ Created household ${houseNum} with water meter`);

      // Parse meter readings from sheet
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log(`   📋 Sheet has ${sheetData.length} rows`);

      if (sheetData.length > 0) {
        console.log(`   Sample rows:`, sheetData.slice(0, 3));
      }

      // Find data rows (looking for Excel date numbers in first column)
      let readingsImported = 0;

      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i] as any[];
        if (!row || row.length < 2) continue;

        // Skip rows without dates or meter readings
        if (!row[0] || !row[1]) continue;

        try {
          let readingDate: Date;

          // Handle Excel date format
          if (typeof row[0] === "number") {
            // Excel date number
            readingDate = XLSX.SSF.parse_date_code(row[0]);
          } else if (typeof row[0] === "string") {
            readingDate = new Date(row[0]);
          } else {
            continue;
          }

          // Skip invalid dates
          if (isNaN(readingDate.getTime())) continue;

          const meterReading =
            typeof row[1] === "number" ? row[1] : parseFloat(row[1]);
          if (isNaN(meterReading)) continue;

          const consumption = typeof row[3] === "number" ? row[3] : null;

          // Create/find billing period for this reading
          const year = readingDate.getFullYear();
          const quarter = Math.ceil((readingDate.getMonth() + 1) / 3);
          const periodName = `${year}-Q${quarter}`;

          let billingPeriod = await prisma.billingPeriod.findFirst({
            where: { periodName },
          });

          if (!billingPeriod) {
            const startMonth = (quarter - 1) * 3;
            const endMonth = quarter * 3 - 1;

            billingPeriod = await prisma.billingPeriod.create({
              data: {
                periodName,
                periodType: "quarterly",
                startDate: new Date(year, startMonth, 1),
                endDate: new Date(year, endMonth + 1, 0),
                readingDeadline: readingDate,
                isOfficialBilling: true,
                isBillingEnabled: true,
              },
            });
            console.log(`   📅 Created billing period: ${periodName}`);
          }

          // Create meter reading
          await prisma.householdMeterReading.create({
            data: {
              householdMeterId: householdMeter.id,
              billingPeriodId: billingPeriod.id,
              meterReading,
              readingDate,
              rawConsumption: consumption,
            },
          });

          readingsImported++;
        } catch (error) {
          console.log(`   ⚠️  Error processing row ${i + 1}:`, error);
        }
      }

      console.log(`   ✅ Imported ${readingsImported} meter readings`);
      totalReadingsImported += readingsImported;
    }

    console.log(`\n🎉 Import completed!`);
    console.log(`📊 Summary:`);
    console.log(`   • 1 utility service (Vatten)`);
    console.log(`   • 2 main meters`);
    console.log(`   • 14 households with meters`);
    console.log(`   • ${totalReadingsImported} meter readings imported`);
  } catch (error) {
    console.error("❌ Error importing Excel data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

importExcelData();
