"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var XLSX = __importStar(require("xlsx"));
function extractRealPricesFromExcel() {
    return __awaiter(this, void 0, void 0, function () {
        var excelPath, workbook, mainSheet, mainData, i, headerRowIndex, headers, i, row, i, row, dateCol, pricePerM3InclCol, fastAvgPerHouseholdCol, medlemsAvgCol, pricingData, i, row, date, pricePerM3Incl, fastAvgPerHousehold, medlemsAvgTotal, medlemsAvgPerHousehold, uniquePricing_1, sortedPricing, waterPricingHistory_1, membershipPricingHistory_1;
        return __generator(this, function (_a) {
            console.log("💰 Extracting real pricing data from Excel...\n");
            try {
                excelPath = "../Gröngräset.xlsx";
                workbook = XLSX.readFile(excelPath);
                // Extract pricing from "Huvud mätare" sheet
                console.log("📋 Reading pricing from 'Huvud mätare' sheet...");
                mainSheet = workbook.Sheets["Huvud mätare"];
                mainData = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });
                // Look at first few rows to find the actual header row
                console.log("First 5 rows:");
                for (i = 0; i < Math.min(5, mainData.length); i++) {
                    console.log("Row ".concat(i, ":"), mainData[i]);
                }
                headerRowIndex = -1;
                headers = [];
                for (i = 0; i < Math.min(10, mainData.length); i++) {
                    row = mainData[i];
                    if (row &&
                        row.some(function (cell) { return cell && cell.toString().includes("Pris/m3"); })) {
                        headerRowIndex = i;
                        headers = row.map(function (cell) { return (cell ? cell.toString() : ""); });
                        break;
                    }
                }
                if (headerRowIndex === -1) {
                    console.log("❌ Could not find header row with pricing columns");
                    console.log("Available columns in first 10 rows:");
                    for (i = 0; i < Math.min(10, mainData.length); i++) {
                        row = mainData[i];
                        if (row && row.length > 0) {
                            console.log("Row ".concat(i, ":"), row.filter(function (cell) { return cell && cell.toString().trim(); }).slice(0, 10));
                        }
                    }
                    return [2 /*return*/];
                }
                console.log("\nFound headers in row ".concat(headerRowIndex, ":"), headers);
                dateCol = headers.findIndex(function (h) { return h && (h.includes("datum") || h.includes("Datum")); });
                pricePerM3InclCol = headers.findIndex(function (h) { return h && h.includes("Pris/m3"); });
                fastAvgPerHouseholdCol = headers.findIndex(function (h) { return h && h.includes("Summa fast avg"); });
                medlemsAvgCol = headers.findIndex(function (h) { return h && h.includes("Medlems avg"); });
                console.log("\nColumn positions:");
                console.log("  Date: ".concat(dateCol, " (").concat(headers[dateCol], ")"));
                console.log("  Pris/m3 ink.moms: ".concat(pricePerM3InclCol, " (").concat(headers[pricePerM3InclCol], ")"));
                console.log("  Summa fast avg/hush\u00E5ll: ".concat(fastAvgPerHouseholdCol, " (").concat(headers[fastAvgPerHouseholdCol], ")"));
                console.log("  Medlems avg: ".concat(medlemsAvgCol, " (").concat(headers[medlemsAvgCol], ")"));
                pricingData = [];
                for (i = headerRowIndex + 1; i < mainData.length; i++) {
                    row = mainData[i];
                    if (!row || row.length === 0 || !row[dateCol])
                        continue;
                    try {
                        date = void 0;
                        if (typeof row[dateCol] === "number") {
                            date = new Date((row[dateCol] - 25569) * 86400 * 1000);
                        }
                        else {
                            date = new Date(row[dateCol]);
                        }
                        if (!date || isNaN(date.getTime()))
                            continue;
                        pricePerM3Incl = row[pricePerM3InclCol];
                        fastAvgPerHousehold = row[fastAvgPerHouseholdCol];
                        medlemsAvgTotal = row[medlemsAvgCol];
                        medlemsAvgPerHousehold = medlemsAvgTotal
                            ? Number(medlemsAvgTotal) / 14
                            : null;
                        if (pricePerM3Incl !== undefined ||
                            fastAvgPerHousehold !== undefined ||
                            medlemsAvgTotal !== undefined) {
                            pricingData.push({
                                date: date.toISOString().split("T")[0],
                                pricePerM3Incl: Number(pricePerM3Incl) || null,
                                fastAvgPerHousehold: Number(fastAvgPerHousehold) || null,
                                medlemsAvgPerHousehold: medlemsAvgPerHousehold,
                                medlemsAvgTotal: Number(medlemsAvgTotal) || null,
                                rowIndex: i + 1,
                            });
                        }
                    }
                    catch (error) {
                        // Skip invalid rows
                    }
                }
                console.log("\n\uD83D\uDCCA Found ".concat(pricingData.length, " pricing data points from main sheet:"));
                uniquePricing_1 = new Map();
                pricingData.forEach(function (item) {
                    var key = "".concat(item.pricePerM3Incl, "-").concat(item.fastAvgPerHousehold, "-").concat(item.medlemsAvgPerHousehold);
                    if (!uniquePricing_1.has(key)) {
                        uniquePricing_1.set(key, []);
                    }
                    uniquePricing_1.get(key).push(item);
                });
                console.log("\n🎯 Chronological pricing progression:");
                sortedPricing = Array.from(uniquePricing_1.entries()).sort(function (_a, _b) {
                    var a = _a[1];
                    var b = _b[1];
                    return new Date(a[0].date).getTime() - new Date(b[0].date).getTime();
                });
                sortedPricing.forEach(function (_a, index) {
                    var key = _a[0], items = _a[1];
                    var sample = items[0];
                    console.log("\n".concat(index + 1, ". Pricing period: ").concat(items[0].date, " \u2192 ").concat(items[items.length - 1].date));
                    console.log("   \uD83D\uDCA7 Pris/m\u00B3 ink.moms: ".concat(sample.pricePerM3Incl, " kr"));
                    console.log("   \uD83C\uDFE0 Fast avg per hush\u00E5ll: ".concat(sample.fastAvgPerHousehold, " kr"));
                    console.log("   \uD83D\uDC65 Medlemsavgift per hush\u00E5ll: ".concat(sample.medlemsAvgPerHousehold, " kr (total: ").concat(sample.medlemsAvgTotal, ")"));
                    console.log("   \uD83D\uDCC5 Periods with this pricing: ".concat(items.length));
                });
                // Generate utility pricing data structure for import
                console.log("\n🏗️  Utility pricing data structure for import:");
                waterPricingHistory_1 = [];
                membershipPricingHistory_1 = [];
                sortedPricing.forEach(function (_a) {
                    var key = _a[0], items = _a[1];
                    var sample = items[0];
                    var effectiveDate = items[0].date;
                    if (sample.pricePerM3Incl && sample.fastAvgPerHousehold) {
                        waterPricingHistory_1.push({
                            effectiveDate: effectiveDate,
                            pricePerUnit: sample.pricePerM3Incl,
                            fixedFeePerHousehold: sample.fastAvgPerHousehold,
                            notes: "Water pricing from ".concat(effectiveDate, " (from Excel Huvud m\u00E4tare)"),
                        });
                    }
                    if (sample.medlemsAvgPerHousehold) {
                        membershipPricingHistory_1.push({
                            effectiveDate: effectiveDate,
                            pricePerUnit: 0,
                            fixedFeePerHousehold: sample.medlemsAvgPerHousehold,
                            notes: "Membership fee from ".concat(effectiveDate, " (").concat(sample.medlemsAvgTotal, " kr total / 14 households)"),
                        });
                    }
                });
                console.log("\nWater pricing history for import:");
                waterPricingHistory_1.forEach(function (pricing, i) {
                    console.log("  ".concat(i + 1, ". ").concat(pricing.effectiveDate, ": ").concat(pricing.pricePerUnit, " kr/m\u00B3 + ").concat(pricing.fixedFeePerHousehold, " kr fixed"));
                });
                console.log("\nMembership pricing history for import:");
                membershipPricingHistory_1.forEach(function (pricing, i) {
                    console.log("  ".concat(i + 1, ". ").concat(pricing.effectiveDate, ": ").concat(pricing.fixedFeePerHousehold, " kr per household"));
                });
                return [2 /*return*/, {
                        waterPricingHistory: waterPricingHistory_1,
                        membershipPricingHistory: membershipPricingHistory_1,
                    }];
            }
            catch (error) {
                console.error("❌ Error extracting pricing data:", error);
            }
            return [2 /*return*/];
        });
    });
}
extractRealPricesFromExcel();
