import assert from "node:assert";
import { mmToDots, generateTsplLabel, getPrintPageHeightMm, DEFAULT_TEMPLATES } from "./tspl-engine";
import { getCategoryCode, isValidTagBarcode } from "./tag-generator";

console.log("=========================================");
console.log(" Running Jewellery Tag & TSPL Unit Tests ");
console.log("=========================================");

// Test 1: mmToDots conversion at 203 DPI
const dots25mm = mmToDots(25, 203);
assert.strictEqual(dots25mm, 200, "25mm should convert to 200 dots at 203 DPI");
console.log("✓ Test 1 Passed: 25mm = 200 dots @ 203 DPI");

const dots60mm = mmToDots(60, 203);
assert.strictEqual(dots60mm, 480, "60mm should convert to 480 dots at 203 DPI");
console.log("✓ Test 2 Passed: 60mm = 480 dots @ 203 DPI");

// Test 2: Category Code Resolution
assert.strictEqual(getCategoryCode("RING"), "RG", "Ring category should map to RG");
assert.strictEqual(getCategoryCode("NECKLACE"), "NL", "Necklace category should map to NL");
assert.strictEqual(getCategoryCode("BANGLE"), "BG", "Bangle category should map to BG");
console.log("✓ Test 3 Passed: Category codes mapped correctly");

// Test 3: Barcode Format Validation
assert.strictEqual(isValidTagBarcode("SGD26RG00001"), true, "Valid tag barcode");
assert.strictEqual(isValidTagBarcode("sgd26rg00001"), true, "Tag validation is case-insensitive");
assert.strictEqual(isValidTagBarcode("RG-00001"), true, "Hyphens are valid Code 128 tag characters");
assert.strictEqual(isValidTagBarcode(""), false, "Empty tag is invalid");
assert.strictEqual(isValidTagBarcode("A B C"), false, "Whitespace is invalid in barcode values");
assert.strictEqual(isValidTagBarcode("TAG\"001"), false, "Quotes are invalid in TSPL barcode values");
assert.strictEqual(isValidTagBarcode("A".repeat(31)), false, "Overlong barcode values are rejected");
console.log("✓ Test 4 Passed: Code 128 barcode validation works");

// Test 4: TSPL Command Generator for TVS LP 46 Dlite
const sampleItem = {
  tagNo: "SGD26RG00001",
  name: "22K Gold Ring",
  category: "RING",
  metal: "GOLD",
  purity: "22K916",
  grossWeight: 4.52,
  netWeight: 4.2,
  stoneWeight: 0.32,
  huid: "H12345",
  shopName: "SURYA GOLD",
};

const tsplOutput = generateTsplLabel(sampleItem, DEFAULT_TEMPLATES[0], {
  widthMm: 60,
  heightMm: 25,
  gapMm: 3,
  density: 10,
  speed: 4,
  orientation: 0,
  copies: 1,
});

assert.ok(tsplOutput.includes("SIZE 60 mm, 25 mm"), "TSPL output contains SIZE 60 mm, 25 mm");
assert.ok(tsplOutput.includes("GAP 3 mm, 0"), "TSPL output contains GAP 3 mm, 0");
assert.ok(tsplOutput.includes("SPEED 4"), "TSPL output contains SPEED 4");
assert.ok(tsplOutput.includes("DENSITY 10"), "TSPL output contains DENSITY 10");
assert.ok(tsplOutput.includes("CLS"), "TSPL output contains CLS buffer clear");
assert.ok(tsplOutput.includes('BARCODE'), "TSPL output contains BARCODE command");
assert.ok(tsplOutput.includes("PRINT 1,1"), "TSPL output contains PRINT 1,1");
console.log("✓ Test 5 Passed: TSPL command generation for TVS LP 46 Dlite verified!");

const dualColumnOutput = generateTsplLabel(sampleItem, DEFAULT_TEMPLATES[1], {
  widthMm: DEFAULT_TEMPLATES[1].widthMm,
  heightMm: DEFAULT_TEMPLATES[1].heightMm,
  gapMm: DEFAULT_TEMPLATES[1].gapMm,
  density: 10,
  speed: 4,
  orientation: 0,
  copies: 1,
});
assert.ok(dualColumnOutput.includes("SIZE 108 mm, 53 mm"), "Two-across template creates one 108×53 mm sheet");
assert.strictEqual(dualColumnOutput.split("\n").filter((line) => line.startsWith("BARCODE ")).length, 4,
  "Two-across template prints a barcode in each of four positions");
assert.ok(dualColumnOutput.includes(',1,2,"SGD26RG00001"'), "Barcode module width follows selected label dimensions");
assert.ok(dualColumnOutput.includes("BARCODE 8,304,"), "Second row is positioned 28 mm below the first row");
assert.strictEqual(getPrintPageHeightMm(DEFAULT_TEMPLATES[1]), 53, "Dual-column sheet height includes two tag rows and row gap");
assert.ok(dualColumnOutput.includes("PRINT 1,1"), "Four-up layout is sent as one page");
console.log("✓ Test 6 Passed: One-page 2×2 sheet layout and barcode positioning verified");

console.log("\nAll unit tests passed successfully!");
