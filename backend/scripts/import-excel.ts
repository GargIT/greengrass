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

    // Step 1: Create or find Water utility service
    console.log("\n💧 Creating/finding Water utility service...");
    let waterService = await prisma.utilityService.findFirst({
      where: { name: "Vatten" },
    });

    if (!waterService) {
      waterService = await prisma.utilityService.create({
        data: {
          name: "Vatten",
          unit: "m³",
          isActive: true,
        },
      });
      console.log(`✅ Created: ${waterService.name}`);
    } else {
      console.log(`✅ Found existing: ${waterService.name}`);
    }

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

      // Create/find 2 main meters for water (based on previous analysis)
      let mainMeter1 = await prisma.mainMeter.findFirst({
        where: { meterIdentifier: "Huvudmätare 1" },
      });

      if (!mainMeter1) {
        mainMeter1 = await prisma.mainMeter.create({
          data: {
            serviceId: waterService.id,
            meterIdentifier: "Huvudmätare 1",
            meterSerial: "HUV-001",
            isActive: true,
          },
        });
        console.log(`✅ Created: ${mainMeter1.meterIdentifier}`);
      } else {
        console.log(`✅ Found existing: ${mainMeter1.meterIdentifier}`);
      }

      let mainMeter2 = await prisma.mainMeter.findFirst({
        where: { meterIdentifier: "Huvudmätare 2" },
      });

      if (!mainMeter2) {
        mainMeter2 = await prisma.mainMeter.create({
          data: {
            serviceId: waterService.id,
            meterIdentifier: "Huvudmätare 2",
            meterSerial: "HUV-002",
            isActive: true,
          },
        });
        console.log(`✅ Created: ${mainMeter2.meterIdentifier}`);
      } else {
        console.log(`✅ Found existing: ${mainMeter2.meterIdentifier}`);
      }
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

      // Create/find household
      let household = await prisma.household.findFirst({
        where: { householdNumber: houseNum },
      });

      if (!household) {
        household = await prisma.household.create({
          data: {
            householdNumber: houseNum,
            ownerName: `Gräsvägen ${houseNum}`, // Placeholder name
            address: `Gräsvägen ${houseNum}`,
            isActive: true,
          },
        });
        console.log(`✅ Created household ${houseNum}`);
      } else {
        console.log(`✅ Found existing household ${houseNum}`);
      }

      // Create/find household meter for water
      let householdMeter = await prisma.householdMeter.findFirst({
        where: {
          householdId: household.id,
          serviceId: waterService.id,
        },
      });

      if (!householdMeter) {
        householdMeter = await prisma.householdMeter.create({
          data: {
            householdId: household.id,
            serviceId: waterService.id,
            meterSerial: `VAT-${houseNum}`,
            isActive: true,
          },
        });
        console.log(`✅ Created water meter for household ${houseNum}`);
      } else {
        console.log(`✅ Found existing water meter for household ${houseNum}`);
      }

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
            // Excel date number - convert to JavaScript Date
            // Excel dates are days since 1900-01-01 (with some quirks)
            const excelDate = row[0];
            readingDate = new Date((excelDate - 25569) * 86400 * 1000);
          } else if (typeof row[0] === "string") {
            readingDate = new Date(row[0]);
          } else {
            continue;
          }

          // Skip invalid dates
          if (!readingDate || isNaN(readingDate.getTime())) {
            console.log(`   ⚠️  Invalid date in row ${i + 1}:`, row[0]);
            continue;
          }

          const meterReading =
            typeof row[1] === "number" ? row[1] : parseFloat(row[1]);
          if (isNaN(meterReading)) continue;

          const consumption = typeof row[3] === "number" ? row[3] : null;

          // Create/find billing period for this reading (use reading date as period name)
          const periodName = readingDate.toISOString().split("T")[0]; // YYYY-MM-DD format

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

    console.log(`\n✅ Import completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`  • Total meter readings imported: ${totalReadingsImported}`);
    console.log(`  • Households processed: ${houseNumbers.length}`);
  } catch (error) {
    console.error("❌ Error importing data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

importExcelData();
