import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { extractPricingHistoryFromExcel } from "./lib/pricing-extractor";

const prisma = new PrismaClient();

async function importExcelDataComplete() {
  console.log("🚀 COMPLETE EXCEL IMPORT - Gröngräset Data");
  console.log("=".repeat(80));
  console.log("This script will:");
  console.log("1. 🧹 Reset existing data (except users)");
  console.log("2. 💧 Setup utility services and pricing");
  console.log("3. 📥 Import households and readings");
  console.log("4. 📊 Import main meter readings (from Excel)");
  console.log("4.5 🧹 Clean bad periods and fix data issues");
  console.log("5. ⚖️  Calculate reconciliation for all periods");
  console.log("6. 💰 Generate bills for all periods");
  console.log("7. 📋 Generate quarterly bills");
  console.log("");

  try {
    // =================================================================
    // STEP 1: RESET DATA (EXCEPT USERS)
    // =================================================================
    console.log("🧹 STEP 1: Resetting existing data (except users)...\n");

    await prisma.utilityBilling.deleteMany({});
    console.log("✅ Cleared utility billing");

    await prisma.utilityReconciliation.deleteMany({});
    console.log("✅ Cleared reconciliation");

    await prisma.householdMeterReading.deleteMany({});
    console.log("✅ Cleared household meter readings");

    await prisma.mainMeterReading.deleteMany({});
    console.log("✅ Cleared main meter readings");

    await prisma.payment.deleteMany({});
    console.log("✅ Cleared payments");

    await prisma.monthlyBill.deleteMany({});
    console.log("✅ Cleared monthly bills");

    await prisma.quarterlyBill.deleteMany({});
    console.log("✅ Cleared quarterly bills");

    await prisma.billingPeriod.deleteMany({});
    console.log("✅ Cleared billing periods");

    await prisma.householdMeter.deleteMany({});
    console.log("✅ Cleared household meters");

    await prisma.mainMeter.deleteMany({});
    console.log("✅ Cleared main meters");

    await prisma.household.deleteMany({});
    console.log("✅ Cleared households");

    await prisma.utilityPricing.deleteMany({});
    console.log("✅ Cleared utility pricing");

    await prisma.utilityService.deleteMany({});
    console.log("✅ Cleared utility services");

    await prisma.sharedCost.deleteMany({});
    console.log("✅ Cleared shared costs");

    // =================================================================
    // STEP 2: SETUP UTILITY SERVICES AND PRICING
    // =================================================================
    console.log("\n💧 STEP 2: Setting up utility services and pricing...\n");

    // Create Water service
    const waterService = await prisma.utilityService.create({
      data: {
        name: "Vatten",
        description: "Vattenförsörjning för samfällighetsföreningen",
        unit: "m³",
        serviceType: "WATER",
        isActive: true,
        hasMainMeters: true,
        mainMeterCount: 2,
        requiresReconciliation: true,
      },
    });
    console.log(`✅ Created water service: ${waterService.name}`);

    // Create Membership service
    const membershipService = await prisma.utilityService.create({
      data: {
        name: "Medlemsavgift",
        description: "Kvartalsmässig medlemsavgift för samfällighetsföreningen",
        unit: "kr/kvartal",
        serviceType: "MEMBERSHIP",
        isActive: true,
        hasMainMeters: false,
        requiresReconciliation: false,
      },
    });
    console.log(`✅ Created membership service: ${membershipService.name}`);

    // Extract real pricing history from Excel
    console.log("📊 Extracting pricing history from Excel...");
    const pricingData = await extractPricingHistoryFromExcel();

    if (!pricingData) {
      console.error("❌ Failed to extract pricing history from Excel");
      return;
    }

    const { waterPricingHistory, membershipPricingHistory } = pricingData;

    // Create Water pricing (from Excel)
    console.log(
      `💧 Importing ${waterPricingHistory.length} water pricing periods...`
    );
    let waterPricing;
    for (let i = 0; i < waterPricingHistory.length; i++) {
      const pricing = waterPricingHistory[i];
      const isActive = i === waterPricingHistory.length - 1; // Only latest is active
      waterPricing = await prisma.utilityPricing.create({
        data: {
          serviceId: waterService.id,
          effectiveDate: new Date(pricing.effectiveDate),
          pricePerUnit: pricing.pricePerUnit,
          fixedFeePerHousehold: pricing.fixedFeePerHousehold,
          isActive,
          notes: pricing.notes,
        },
      });
      console.log(
        `✅ ${pricing.effectiveDate}: ${pricing.pricePerUnit} kr/m³ + ${pricing.fixedFeePerHousehold} kr fixed`
      );
    }

    // Create Membership pricing (from Excel)
    console.log(
      `👥 Importing ${membershipPricingHistory.length} membership pricing periods...`
    );
    let membershipPricing;
    for (let i = 0; i < membershipPricingHistory.length; i++) {
      const pricing = membershipPricingHistory[i];
      const isActive = i === membershipPricingHistory.length - 1; // Only latest is active
      membershipPricing = await prisma.utilityPricing.create({
        data: {
          serviceId: membershipService.id,
          effectiveDate: new Date(pricing.effectiveDate),
          pricePerUnit: pricing.pricePerUnit,
          fixedFeePerHousehold: pricing.fixedFeePerHousehold,
          isActive,
          notes: pricing.notes,
        },
      });
      console.log(
        `✅ ${pricing.effectiveDate}: ${pricing.fixedFeePerHousehold} kr membership fee`
      );
    }

    console.log(
      `\n✅ Created ${waterPricingHistory.length} water pricing periods + ${membershipPricingHistory.length} membership pricing periods`
    );
    console.log(
      `✅ Created ${membershipPricingHistory.length} membership pricing periods`
    );

    // =================================================================
    // STEP 3: IMPORT EXCEL DATA
    // =================================================================
    console.log("\n📥 STEP 3: Importing Excel data...\n");

    const excelPath = "../Gröngräset.xlsx";
    console.log(`Reading from: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);

    // Create main meters
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
    console.log(`✅ Created 2 main meters for water`);

    // Import households and readings
    const houseNumbers = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];
    let totalReadingsImported = 0;

    for (const houseNum of houseNumbers) {
      const sheetName = `Gräsv.${houseNum}`;
      console.log(`Processing ${sheetName}...`);

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        console.log(`❌ Sheet ${sheetName} not found`);
        continue;
      }

      // Create household
      const household = await prisma.household.create({
        data: {
          householdNumber: houseNum,
          ownerName: `Gräsvägen ${houseNum}`,
          address: `Gräsvägen ${houseNum}`,
          isActive: true,
        },
      });

      // Create household water meter
      const householdMeter = await prisma.householdMeter.create({
        data: {
          householdId: household.id,
          serviceId: waterService.id,
          meterSerial: `VAT-${houseNum}`,
          isActive: true,
        },
      });

      // Create household membership meter (virtual)
      await prisma.householdMeter.create({
        data: {
          householdId: household.id,
          serviceId: membershipService.id,
          meterSerial: null,
          isActive: true,
        },
      });

      // Parse meter readings
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      let readingsImported = 0;

      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i] as any[];
        if (!row || row.length < 2 || !row[0] || !row[1]) continue;

        try {
          let readingDate: Date;
          if (typeof row[0] === "number") {
            readingDate = new Date((row[0] - 25569) * 86400 * 1000);
          } else {
            readingDate = new Date(row[0]);
          }

          if (!readingDate || isNaN(readingDate.getTime())) continue;

          const meterReading =
            typeof row[1] === "number" ? row[1] : parseFloat(row[1]);
          if (isNaN(meterReading)) continue;

          const consumption = typeof row[3] === "number" ? row[3] : null;
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
          }

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
          // Skip invalid rows
        }
      }

      console.log(`  ✅ Household ${houseNum}: ${readingsImported} readings`);
      totalReadingsImported += readingsImported;
    }

    console.log(
      `✅ Imported ${totalReadingsImported} household meter readings`
    );

    // =================================================================
    // STEP 4: IMPORT MAIN METER READINGS (FROM EXCEL)
    // =================================================================
    console.log("\n📊 STEP 4: Importing main meter readings from Excel...\n");

    // Get the main meter sheet
    const mainMeterSheet = workbook.Sheets["Huvud mätare"];
    if (!mainMeterSheet) {
      console.log("❌ 'Huvud mätare' sheet not found");
      return;
    }

    // Convert to array
    const mainMeterData = XLSX.utils.sheet_to_json(mainMeterSheet, {
      header: 1,
    });
    console.log(`📋 Main meter sheet has ${mainMeterData.length} rows`);

    let mainReadingsCreated = 0;

    // Process data rows (skip headers, start from row with actual data)
    for (let i = 4; i < mainMeterData.length; i++) {
      const row = mainMeterData[i] as any[];
      if (!row || row.length < 7) continue;

      // Check if this looks like a data row (first column should be Excel date)
      if (typeof row[0] !== "number") continue;

      try {
        // Parse date
        const excelDate = row[0];
        const readingDate = new Date((excelDate - 25569) * 86400 * 1000);

        // Skip invalid dates
        if (!readingDate || isNaN(readingDate.getTime())) {
          continue;
        }

        // Parse meter readings
        const meter1Reading =
          typeof row[1] === "number" ? row[1] : parseFloat(row[1]);
        const meter2Reading =
          typeof row[4] === "number" ? row[4] : parseFloat(row[4]);

        // Skip if readings are invalid
        if (isNaN(meter1Reading) || isNaN(meter2Reading)) {
          continue;
        }

        // Find or create billing period
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
        }

        // Create meter reading for Meter 1
        try {
          await prisma.mainMeterReading.create({
            data: {
              meterId: mainMeter1.id,
              billingPeriodId: billingPeriod.id,
              meterReading: meter1Reading,
              readingDate,
              consumption: null, // Will be calculated later
            },
          });
          mainReadingsCreated++;
        } catch (error) {
          // Probably duplicate, skip
        }

        // Create meter reading for Meter 2
        try {
          await prisma.mainMeterReading.create({
            data: {
              meterId: mainMeter2.id,
              billingPeriodId: billingPeriod.id,
              meterReading: meter2Reading,
              readingDate,
              consumption: null, // Will be calculated later
            },
          });
          mainReadingsCreated++;
        } catch (error) {
          // Probably duplicate, skip
        }

        if (mainReadingsCreated <= 10) {
          console.log(
            `   ✅ ${periodName}: Meter1=${meter1Reading}m³, Meter2=${meter2Reading}m³`
          );
        }
      } catch (error) {
        console.log(`   ⚠️  Error processing row ${i + 1}:`, error);
      }
    }

    console.log(
      `✅ Imported ${mainReadingsCreated} main meter readings from Excel`
    );

    // Now calculate consumption for main meter readings
    console.log("\n🔢 Calculating consumption for main meter readings...");

    // Get all periods sorted by date for consumption calculation
    const periods = await prisma.billingPeriod.findMany({
      orderBy: { periodName: "asc" },
    });

    let consumptionsCalculated = 0;

    for (let i = 1; i < periods.length; i++) {
      const currentPeriod = periods[i];
      const previousPeriod = periods[i - 1];

      // Get main meter readings for both periods
      const currentReadings = await prisma.mainMeterReading.findMany({
        where: { billingPeriodId: currentPeriod.id },
      });

      const previousReadings = await prisma.mainMeterReading.findMany({
        where: { billingPeriodId: previousPeriod.id },
      });

      // Calculate and update consumption for each meter
      for (const currentReading of currentReadings) {
        const previousReading = previousReadings.find(
          (p) => p.meterId === currentReading.meterId
        );

        if (previousReading) {
          const consumption =
            Number(currentReading.meterReading) -
            Number(previousReading.meterReading);

          await prisma.mainMeterReading.update({
            where: { id: currentReading.id },
            data: { consumption },
          });

          consumptionsCalculated++;
        }
      }
    }

    console.log(
      `✅ Calculated consumption for ${consumptionsCalculated} main meter readings`
    );

    // =================================================================
    // STEP 4.5: CLEAN BAD PERIODS AND ADD MISSING READINGS
    // =================================================================
    console.log(
      "\n🧹 STEP 4.5: Cleaning bad periods and fixing data issues...\n"
    );

    // Clean up bad periods (before year 2000)
    const badPeriods = await prisma.billingPeriod.findMany({
      where: {
        startDate: {
          lt: new Date("2000-01-01"),
        },
      },
    });

    if (badPeriods.length > 0) {
      console.log(`🗑️  Found ${badPeriods.length} bad periods to clean up`);

      for (const period of badPeriods) {
        // Delete associated readings first
        await prisma.householdMeterReading.deleteMany({
          where: { billingPeriodId: period.id },
        });

        await prisma.mainMeterReading.deleteMany({
          where: { billingPeriodId: period.id },
        });

        // Delete the period
        await prisma.billingPeriod.delete({
          where: { id: period.id },
        });

        console.log(`   ✅ Deleted bad period: ${period.periodName}`);
      }
    } else {
      console.log("✅ No bad periods found");
    }

    // Add missing reading for Hus 12 (meter change in 2019-08-31)
    const household12 = await prisma.household.findFirst({
      where: { householdNumber: 12 },
    });

    if (household12) {
      const meter12 = await prisma.householdMeter.findFirst({
        where: {
          householdId: household12.id,
          service: { serviceType: "WATER" },
        },
        include: { service: true },
      });

      if (meter12) {
        // Check if 2019-08-31 period exists and if reading is missing
        const period2019 = await prisma.billingPeriod.findFirst({
          where: { periodName: "2019-08-31" },
        });

        if (period2019) {
          const existingReading = await prisma.householdMeterReading.findFirst({
            where: {
              householdMeterId: meter12.id,
              billingPeriodId: period2019.id,
            },
          });

          if (!existingReading) {
            // Add the missing reading for meter change
            await prisma.householdMeterReading.create({
              data: {
                householdMeterId: meter12.id,
                billingPeriodId: period2019.id,
                meterReading: 0, // New meter starts at 0
                readingDate: new Date("2019-08-31"),
                rawConsumption: 54, // Estimated consumption
                notes:
                  "Mätarbyte - ny mätare börjar på 0, uppskattad förbrukning",
              },
            });
            console.log("✅ Added missing reading for Hus 12 (meter change)");
          } else {
            console.log("✅ Hus 12 reading already exists for 2019-08-31");
          }
        }
      }
    }

    // =================================================================
    // STEP 5: CALCULATE RECONCILIATION FOR ALL PERIODS
    // =================================================================
    console.log(
      "\n⚖️  STEP 5: Calculating reconciliation for all periods...\n"
    );

    const households = await prisma.household.findMany();
    const householdCount = households.length;
    let reconciliationsCreated = 0;

    for (let i = 1; i < periods.length; i++) {
      const currentPeriod = periods[i];
      const previousPeriod = periods[i - 1];

      // Get main meter readings for consumption calculation
      const currentMainReadings = await prisma.mainMeterReading.findMany({
        where: { billingPeriodId: currentPeriod.id },
      });

      const previousMainReadings = await prisma.mainMeterReading.findMany({
        where: { billingPeriodId: previousPeriod.id },
      });

      if (currentMainReadings.length === 0 || previousMainReadings.length === 0)
        continue;

      // Calculate main meter consumption
      let totalMainConsumption = 0;
      for (const current of currentMainReadings) {
        const previous = previousMainReadings.find(
          (p) => p.meterId === current.meterId
        );
        if (previous) {
          totalMainConsumption +=
            Number(current.meterReading) - Number(previous.meterReading);
        }
      }

      // Get household consumption
      const householdReadings = await prisma.householdMeterReading.findMany({
        where: { billingPeriodId: currentPeriod.id },
      });

      const totalHouseholdConsumption = householdReadings.reduce(
        (sum, reading) => sum + Number(reading.rawConsumption || 0),
        0
      );

      // Calculate reconciliation
      const difference = totalMainConsumption - totalHouseholdConsumption;
      const adjustmentPerHousehold = difference / householdCount;

      await prisma.utilityReconciliation.create({
        data: {
          serviceId: waterService.id,
          billingPeriodId: currentPeriod.id,
          mainMeterTotal: totalMainConsumption,
          householdTotal: totalHouseholdConsumption,
          difference,
          adjustmentPerHousehold,
          reconciliationDate: currentPeriod.readingDeadline,
          notes: `Calculated reconciliation for ${currentPeriod.periodName}`,
        },
      });

      reconciliationsCreated++;
    }

    console.log(`✅ Created ${reconciliationsCreated} reconciliation records`);

    // =================================================================
    // STEP 6: GENERATE BILLS FOR ALL PERIODS
    // =================================================================
    console.log("\n💰 STEP 6: Generating bills for all periods...\n");

    // Generate bills for all periods with reconciliation
    let totalBillsCreated = 0;

    for (let i = 1; i < periods.length; i++) {
      const currentPeriod = periods[i];
      const periodDate = new Date(currentPeriod.periodName);

      // Get correct pricing for this billing period
      const waterPricing = await prisma.utilityPricing.findFirst({
        where: {
          serviceId: waterService.id,
          effectiveDate: { lte: periodDate },
        },
        orderBy: { effectiveDate: "desc" },
      });

      const membershipPricing = await prisma.utilityPricing.findFirst({
        where: {
          serviceId: membershipService.id,
          effectiveDate: { lte: periodDate },
        },
        orderBy: { effectiveDate: "desc" },
      });

      if (!waterPricing || !membershipPricing) {
        console.log(
          `⚠️  Skipping ${currentPeriod.periodName} - no pricing found`
        );
        continue;
      }

      // Get reconciliation for this period
      const reconciliation = await prisma.utilityReconciliation.findFirst({
        where: { billingPeriodId: currentPeriod.id },
      });

      let periodBillsCreated = 0;

      // Get households for this period
      const households = await prisma.household.findMany();

      for (const household of households) {
        // Create water bill
        const waterMeter = await prisma.householdMeter.findFirst({
          where: {
            householdId: household.id,
            service: { serviceType: "WATER" },
          },
        });

        if (waterMeter) {
          const waterReading = await prisma.householdMeterReading.findFirst({
            where: {
              householdMeterId: waterMeter.id,
              billingPeriodId: currentPeriod.id,
            },
          });

          if (waterReading) {
            const rawConsumption = Number(waterReading.rawConsumption || 0);
            const adjustment = reconciliation
              ? Number(reconciliation.adjustmentPerHousehold)
              : 0;
            const adjustedConsumption = rawConsumption + adjustment;

            await prisma.utilityBilling.create({
              data: {
                householdId: household.id,
                serviceId: waterService.id,
                reconciliationId: reconciliation?.id,
                billingPeriodId: currentPeriod.id,
                rawConsumption,
                reconciliationAdjustment: adjustment,
                adjustedConsumption,
                costPerUnit: Number(waterPricing.pricePerUnit),
                consumptionCost:
                  adjustedConsumption * Number(waterPricing.pricePerUnit),
                fixedFeeShare: Number(waterPricing.fixedFeePerHousehold),
                totalUtilityCost:
                  adjustedConsumption * Number(waterPricing.pricePerUnit) +
                  Number(waterPricing.fixedFeePerHousehold),
              },
            });
            periodBillsCreated++;
          }
        }

        // Create membership bill
        await prisma.utilityBilling.create({
          data: {
            householdId: household.id,
            serviceId: membershipService.id,
            billingPeriodId: currentPeriod.id,
            rawConsumption: 0,
            reconciliationAdjustment: 0,
            adjustedConsumption: 0,
            costPerUnit: 0,
            consumptionCost: 0,
            fixedFeeShare: Number(membershipPricing.fixedFeePerHousehold),
            totalUtilityCost: Number(membershipPricing.fixedFeePerHousehold),
          },
        });
        periodBillsCreated++;
      }

      totalBillsCreated += periodBillsCreated;
      console.log(
        `✅ ${currentPeriod.periodName}: ${periodBillsCreated} bills`
      );
    }

    console.log(`✅ Created ${totalBillsCreated} utility billing records`);

    // =================================================================
    // STEP 7: GENERATE QUARTERLY BILLS
    // =================================================================
    console.log("\n📋 STEP 7: Generating quarterly bills...\n");

    // Clear existing quarterly bills
    await prisma.quarterlyBill.deleteMany({});

    const periodsWithBilling = await prisma.billingPeriod.findMany({
      where: {
        utilityBilling: {
          some: {},
        },
      },
      orderBy: { periodName: "asc" },
    });

    let quarterlyBillsCreated = 0;

    for (const period of periodsWithBilling) {
      const householdsWithBilling = await prisma.household.findMany({
        where: {
          utilityBilling: {
            some: {
              billingPeriodId: period.id,
            },
          },
        },
      });

      for (const household of householdsWithBilling) {
        const billingRecords = await prisma.utilityBilling.findMany({
          where: {
            householdId: household.id,
            billingPeriodId: period.id,
          },
          include: {
            service: true,
          },
        });

        if (billingRecords.length > 0) {
          let totalUtilityCosts = 0;
          let memberFee = 0;

          billingRecords.forEach((billing) => {
            if (billing.service.serviceType === "WATER") {
              totalUtilityCosts += Number(billing.totalUtilityCost);
            } else {
              memberFee += Number(billing.totalUtilityCost);
            }
          });

          const totalAmount = totalUtilityCosts + memberFee;
          const dueDate = new Date(period.readingDeadline);
          dueDate.setMonth(dueDate.getMonth() + 4);

          await prisma.quarterlyBill.create({
            data: {
              householdId: household.id,
              billingPeriodId: period.id,
              totalUtilityCosts,
              memberFee,
              sharedCosts: 0,
              totalAmount,
              dueDate,
              status: "paid",
            },
          });

          quarterlyBillsCreated++;
        }
      }
    }

    console.log(`✅ Created ${quarterlyBillsCreated} quarterly bills`);

    // =================================================================
    // FINAL SUMMARY
    // =================================================================
    console.log("\n🎉 IMPORT COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(80));

    const finalStats = {
      households: await prisma.household.count(),
      billingPeriods: await prisma.billingPeriod.count(),
      householdReadings: await prisma.householdMeterReading.count(),
      mainMeterReadings: await prisma.mainMeterReading.count(),
      reconciliations: await prisma.utilityReconciliation.count(),
      utilityBillings: await prisma.utilityBilling.count(),
      pricingPeriods: await prisma.utilityPricing.count(),
    };

    console.log("📊 Final Statistics:");
    console.log(`  🏠 Households: ${finalStats.households}`);
    console.log(`  📅 Billing periods: ${finalStats.billingPeriods}`);
    console.log(`  📊 Household readings: ${finalStats.householdReadings}`);
    console.log(`  📈 Main meter readings: ${finalStats.mainMeterReadings}`);
    console.log(`  ⚖️  Reconciliations: ${finalStats.reconciliations}`);
    console.log(`  💰 Utility billings: ${finalStats.utilityBillings}`);
    console.log(`  💲 Pricing periods: ${finalStats.pricingPeriods}`);

    console.log("\n✅ System ready for use!");
    console.log("💡 You can now:");
    console.log("  - View bills: npx tsx scripts/view-bills.ts");
    console.log(
      "  - Check reconciliation: npx tsx scripts/view-reconciliation-report.ts"
    );
    console.log(
      "  - Generate new bills: npx tsx scripts/generate-bills-with-both-services.ts"
    );
  } catch (error) {
    console.error("❌ Error during import:", error);
  } finally {
    await prisma.$disconnect();
  }
}

importExcelDataComplete();
