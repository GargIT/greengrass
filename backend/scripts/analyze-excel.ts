import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

async function analyzeExcel() {
  console.log("📊 Analyzing Gröngräset.xlsx...");

  try {
    // Path to Excel file in workspace root
    const currentDir = process.cwd();
    const excelPath = join(currentDir, "../Gröngräset.xlsx");
    console.log(`Reading from: ${excelPath}`);

    // Read the Excel file
    const workbook = XLSX.readFile(excelPath);

    console.log("\n📋 Worksheet names:");
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });

    // Analyze each worksheet
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n\n=== SHEET ${index + 1}: ${sheetName} ===`);

      const worksheet = workbook.Sheets[sheetName];

      // Get sheet range
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
      console.log(
        `Range: ${XLSX.utils.encode_range(range)} (${range.e.r + 1} rows, ${
          range.e.c + 1
        } columns)`
      );

      // Convert to JSON to see structure
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Show first few rows
      console.log("\n📝 First 10 rows:");
      jsonData.slice(0, 10).forEach((row: any, idx: number) => {
        if (row && row.length > 0) {
          console.log(`  Row ${idx + 1}:`, row);
        }
      });

      // Try to detect headers
      if (jsonData.length > 0) {
        const possibleHeaders = jsonData[0] as any[];
        if (
          possibleHeaders &&
          possibleHeaders.some(
            (header) => typeof header === "string" && header.trim()
          )
        ) {
          console.log("\n🏷️  Possible headers:", possibleHeaders);
        }
      }

      // Look for numeric data patterns
      const numericRows = jsonData.filter(
        (row: any) =>
          Array.isArray(row) && row.some((cell) => typeof cell === "number")
      );

      if (numericRows.length > 0) {
        console.log(`\n📊 Found ${numericRows.length} rows with numeric data`);
        console.log("  Sample numeric row:", numericRows[0]);
      }

      // Look for dates
      const datePattern =
        /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/;
      const dateRows = jsonData.filter(
        (row: any) =>
          Array.isArray(row) &&
          row.some((cell) => typeof cell === "string" && datePattern.test(cell))
      );

      if (dateRows.length > 0) {
        console.log(`\n📅 Found ${dateRows.length} rows with date patterns`);
        console.log("  Sample date row:", dateRows[0]);
      }
    });
  } catch (error) {
    console.error("❌ Error analyzing Excel file:", error);
  }
}

analyzeExcel();
