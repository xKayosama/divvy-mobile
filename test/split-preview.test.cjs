const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const filename = path.resolve(__dirname, "../src/features/expenses/splitPreview.ts");
const { splitPreview } = require(filename);
const members = ["first", "second", "third"];

test("equal splits conserve cents and assign the remainder to the first selected member", () => {
  assert.deepEqual(splitPreview("100", "EQUAL", members, {}).amounts, [3334, 3333, 3333]);
  assert.deepEqual(splitPreview("0.01", "EQUAL", members, {}).amounts, [1, 0, 0]);
});
test("exact splits show incomplete, over-assigned and complete totals", () => {
  assert.equal(splitPreview("100", "EXACT", members, { first: "25" }).remaining, 7500);
  assert.equal(splitPreview("100", "EXACT", members, { first: "101" }).remaining, -100);
  const preview = splitPreview("100", "EXACT", members, { first: "25", second: "75", third: "0" });
  assert.equal(preview.complete, true);
  assert.deepEqual(preview.amounts, [2500, 7500, 0]);
});
test("percentage amounts reconcile with the total using the backend rounding adjustment", () => {
  const preview = splitPreview("0.05", "PERCENTAGE", members, { first: "33.33", second: "33.33", third: "33.34" });
  assert.equal(preview.complete, true);
  assert.deepEqual(preview.amounts, [2, 2, 1]);
  assert.equal(splitPreview("100", "PERCENTAGE", members, { first: "40" }).remaining, 6000);
  assert.equal(splitPreview("100", "PERCENTAGE", members, { first: "101" }).complete, false);
});
test("invalid or missing input never presents a completed split", () => {
  for (const amount of ["", "-1", "0", "NaN", "1.234", "999999999999999999"]) {
    assert.equal(splitPreview(amount, "EQUAL", members, {}), null);
  }
  assert.equal(splitPreview("100", "EQUAL", [], {}), null);
  assert.equal(splitPreview("100", "EXACT", members, { first: "100", second: "", third: "0" }).complete, false);
  assert.equal(splitPreview("1,50", "EQUAL", ["first"], {}).amounts[0], 150);
});


test("native precision conserves JPY whole units and KWD fils", () => {
  assert.deepEqual(splitPreview("100", "EQUAL", members, {}, "JPY").amounts, [34, 33, 33]);
  assert.deepEqual(splitPreview("0.100", "EQUAL", members, {}, "KWD").amounts, [34, 33, 33]);
  assert.equal(splitPreview("1.1", "EQUAL", members, {}, "JPY"), null);
  assert.equal(splitPreview("0.0001", "EQUAL", members, {}, "KWD"), null);
  assert.equal(splitPreview("1", "EXACT", members, { first: "0.001", second: "0.999", third: "0" }, "KWD").complete, true);
  assert.equal(splitPreview("100", "PERCENTAGE", members, { first: "33.33", second: "33.33", third: "33.34" }, "JPY").complete, true);
});
test("tiny percentage totals never produce negative shares", () => {
  const preview = splitPreview("2", "PERCENTAGE", ["a", "b", "c", "d"], { a: "25", b: "25", c: "25", d: "25" }, "JPY");
  assert.ok(preview.amounts.every(value => value >= 0));
  assert.equal(preview.amounts.reduce((sum, value) => sum + value, 0), 2);
});
