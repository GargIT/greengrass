import * as XLSX from "xlsx";

interface PricingData {
  date: string;
  pricePerM3Incl: number | null;
  fastAvgPerHousehold: number | null;
  medlemsAvgPerHousehold: number | null;
  medlemsAvgTotal: number | null;
  rowIndex: number;
}

export interface PricingHistory {
  effectiveDate: string;
  pricePerUnit: number;
  fixedFeePerHousehold: number;
  notes: string;
}

export async function extractPricingHistoryFromExcel(): Promise<{
  waterPricingHistory: PricingHistory[];
  membershipPricingHistory: PricingHistory[];
} | null> {
  try {
    const excelPath = "../Gröngräset.xlsx";
    const workbook = XLSX.readFile(excelPath);

    // Determine number of households dynamically from sheet names like "Gräsv.<number>"
    const householdSheetCount = workbook.SheetNames.filter((name) =>
      /^Gräsv\.\d+$/.test(name)
    ).length;
    const householdsCount = Math.max(1, householdSheetCount || 0);

    // Extract pricing from "Huvud mätare" sheet
    const mainSheet = workbook.Sheets["Huvud mätare"];
    const mainData = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });

    // Try to find header row with pricing columns
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(10, mainData.length); i++) {
      const row = mainData[i] as any[];
      if (
        row &&
        row.some((cell) => cell && cell.toString().includes("Pris/m3"))
      ) {
        headerRowIndex = i;
        headers = row.map((cell) => (cell ? cell.toString() : ""));
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.error("❌ Could not find header row with pricing columns");
      return null;
    }

    // Find the correct column positions
    const dateCol = headers.findIndex(
      (h) => h && (h.includes("datum") || h.includes("Datum"))
    );
    const pricePerM3InclCol = headers.findIndex(
      (h) => h && h.includes("Pris/m3 ink.moms")
    );
    const fastAvgPerHouseholdCol = headers.findIndex(
      (h) => h && h.includes("Summa fast avg/hushåll")
    );
    const medlemsAvgCol = headers.findIndex(
      (h) => h && h.includes("Medlems avg")
    );

    // Extract pricing data from data rows (starting after header row)
    const pricingData: PricingData[] = [];
    for (let i = headerRowIndex + 1; i < mainData.length; i++) {
      const row = mainData[i] as any[];
      if (!row || row.length === 0 || !row[dateCol]) continue;

      try {
        let date: Date;
        if (typeof row[dateCol] === "number") {
          date = new Date((row[dateCol] - 25569) * 86400 * 1000);
        } else {
          date = new Date(row[dateCol]);
        }

        if (!date || isNaN(date.getTime())) continue;

        const pricePerM3Incl = row[pricePerM3InclCol];
        const fastAvgPerHousehold = row[fastAvgPerHouseholdCol];
        const medlemsAvgTotal = row[medlemsAvgCol];

        // Calculate medlemsavgift per household using dynamic household count
        const medlemsAvgPerHousehold = medlemsAvgTotal
          ? Number(medlemsAvgTotal) / householdsCount
          : null;

        if (
          pricePerM3Incl !== undefined ||
          fastAvgPerHousehold !== undefined ||
          medlemsAvgTotal !== undefined
        ) {
          pricingData.push({
            date: date.toISOString().split("T")[0],
            pricePerM3Incl: Number(pricePerM3Incl) || null,
            fastAvgPerHousehold: Number(fastAvgPerHousehold) || null,
            medlemsAvgPerHousehold,
            medlemsAvgTotal: Number(medlemsAvgTotal) || null,
            rowIndex: i + 1,
          });
        }
      } catch (error) {
        // Skip invalid rows
      }
    }

    // Group by unique pricing combinations and show chronological progression
    const uniquePricing = new Map();
    pricingData.forEach((item) => {
      const key = `${item.pricePerM3Incl}-${item.fastAvgPerHousehold}-${item.medlemsAvgPerHousehold}`;
      if (!uniquePricing.has(key)) {
        uniquePricing.set(key, []);
      }
      uniquePricing.get(key).push(item);
    });

    // Sort by first occurrence date
    const sortedPricing = Array.from(uniquePricing.entries()).sort(
      ([, a], [, b]) =>
        new Date(a[0].date).getTime() - new Date(b[0].date).getTime()
    );

    const waterPricingHistory: PricingHistory[] = [];
    const membershipPricingHistory: PricingHistory[] = [];

    sortedPricing.forEach(([key, items]) => {
      const sample = items[0];
      const effectiveDate = items[0].date;

      if (sample.pricePerM3Incl && sample.fastAvgPerHousehold) {
        waterPricingHistory.push({
          effectiveDate,
          pricePerUnit: sample.pricePerM3Incl,
          fixedFeePerHousehold: sample.fastAvgPerHousehold,
          notes: `Water pricing from ${effectiveDate} (from Excel Huvud mätare)`,
        });
      }

      if (sample.medlemsAvgPerHousehold) {
        membershipPricingHistory.push({
          effectiveDate,
          pricePerUnit: 0,
          fixedFeePerHousehold: sample.medlemsAvgPerHousehold,
          notes: `Membership fee from ${effectiveDate} (${sample.medlemsAvgTotal} kr total / ${householdsCount} households)`,
        });
      }
    });

    return {
      waterPricingHistory,
      membershipPricingHistory,
    };
  } catch (error) {
    console.error("❌ Error extracting pricing history from Excel:", error);
    return null;
  }
}
