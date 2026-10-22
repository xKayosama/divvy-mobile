const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  emptyItem,
  existingItemDrafts,
  receiptItemDrafts,
  itemizedPreview,
} = require("../src/features/expenses/itemized.ts");
const draft = (amount, memberIds = ["a", "b"]) => ({
  ...emptyItem(),
  description: " Pizza ",
  quantity: "2",
  amount,
  memberIds,
});

for (const [currency, amount, expected] of [
  ["JPY", "5", [3, 2]],
  ["PHP", "0.05", [0.03, 0.02]],
  ["KWD", "0.005", [0.003, 0.002]],
]) {
  test(`${currency}: item preview uses native precision and assigns each line remainder deterministically`, () => {
    const result = itemizedPreview([draft(amount)], amount, currency, [
      "a",
      "b",
    ]);
    assert.equal(result.error, "");
    assert.deepEqual(
      result.participants.map((p) => p.amount),
      expected,
    );
    assert.equal(result.items[0].amount, Number(amount));
    assert.equal(result.items[0].quantity, 2);
  });
}

test("item previews aggregate shared and individual items without multiplying quantity", () => {
  const result = itemizedPreview(
    [draft("10", ["a"]), draft("5")],
    "15",
    "PHP",
    ["a", "b"],
  );
  assert.deepEqual(result.participants, [
    { userId: "a", amount: 12.5 },
    { userId: "b", amount: 2.5 },
  ]);
  assert.equal(
    itemizedPreview([draft("1", ["a"]), draft("0", ["b"])], "1", "JPY", [
      "a",
      "b",
    ]).participants[1].amount,
    0,
  );
});

test("missing, mismatched, unsafe or invalid items never produce a saveable preview", () => {
  for (const item of [
    { ...draft("1"), description: "" },
    { ...draft("1"), quantity: "" },
    { ...draft("1"), quantity: "0" },
    { ...draft("1"), quantity: "1000001" },
    { ...draft("1"), quantity: "0.0001" },
    draft(""),
    draft("-1"),
    draft("0.001"),
    draft("1", []),
    draft("1", ["a", "a"]),
    draft("1", ["missing"]),
    draft("999999999999999999"),
  ])
    assert.ok(itemizedPreview([item], "1", "PHP", ["a", "b"]).error);
  assert.ok(itemizedPreview([], "1", "PHP", ["a"]).error);
  assert.ok(
    itemizedPreview(
      Array.from({ length: 101 }, () => draft("1")),
      "101",
      "PHP",
      ["a", "b"],
    ).error,
  );
  assert.ok(itemizedPreview([draft("1")], "2", "PHP", ["a", "b"]).error);
  assert.ok(itemizedPreview([draft("1")], "", "PHP", ["a", "b"]).error);
});

test("receipt prefill preserves extracted values without inventing totals, quantities or assignments", () => {
  const receipt = {
    items: [
      { description: "Milk", quantity: 2, unitPrice: 0.001, total: 0.002 },
      { description: null, quantity: null, unitPrice: 10, total: null },
    ],
    tax: 1,
    tip: 1,
    total: 2.002,
  };
  const items = receiptItemDrafts(receipt);
  assert.equal(items[0].amount, "0.002");
  assert.equal(items[0].quantity, "2");
  assert.equal(items[1].description, "");
  assert.equal(items[1].amount, "");
  assert.equal(items[1].quantity, "");
  assert.deepEqual(items[0].memberIds, []);
  assert.notEqual(items[0].id, items[1].id);
  assert.ok(itemizedPreview(items, "2.002", "KWD", ["a"]).error);
});

test("persisted item drafts round-trip line totals and member IDs without mutating saved records", () => {
  const saved = [
    {
      description: "Pizza",
      quantity: 1.5,
      amount: 0.001,
      memberIds: ["a", "b"],
    },
  ];
  const items = existingItemDrafts(saved);
  assert.equal(items[0].quantity, "1.5");
  assert.equal(items[0].amount, "0.001");
  assert.deepEqual(
    itemizedPreview(items, "0.001", "KWD", ["a", "b"]).items,
    saved,
  );
  items[0].memberIds.pop();
  assert.deepEqual(saved[0].memberIds, ["a", "b"]);
});


test("tax and tip preview independently allocate by subtotal and equally", () => {
 const result=itemizedPreview([draft("75",["a"]),draft("25",["b"])],"130","PHP",["a","b"],{tax:{amount:"20",allocation:"PROPORTIONAL"},tip:{amount:"10",allocation:"EQUAL"}});
 assert.equal(result.error,"");
 assert.deepEqual(result.participants.map(p=>p.amount),[95,35]);
 assert.deepEqual(result.breakdown.a,{items:75,tax:15,tip:5});
 assert.equal(result.adjustments.tax.amount,20);
});
for(const [currency,subtotal,extra,total,expected] of [["JPY","4","1","5",[4,1]],["PHP","0.04","0.01","0.05",[.04,.01]],["KWD","0.004","0.001","0.005",[.004,.001]]]) {
 test(`${currency}: adjustment preview conserves native minor units`,()=>{
  const result=itemizedPreview([draft(String(Number(subtotal)*.75),["a"]),draft(String(Number(subtotal)*.25),["b"])],total,currency,["a","b"],{tax:{amount:extra,allocation:"PROPORTIONAL"},tip:{amount:"",allocation:"EQUAL"}});
  assert.equal(result.error,"");assert.deepEqual(result.participants.map(p=>p.amount),expected);
 });
}
test("invalid extras, mismatch and zero proportional basis block itemized saving",()=>{
 for(const value of ["-1","0.001","bad"]) assert.ok(itemizedPreview([draft("1")],"1","PHP",["a","b"],{tax:{amount:value,allocation:"EQUAL"},tip:{amount:"",allocation:"EQUAL"}}).error);
 assert.ok(itemizedPreview([draft("0")],"1","JPY",["a","b"],{tax:{amount:"1",allocation:"PROPORTIONAL"},tip:{amount:"",allocation:"EQUAL"}}).error);
 const equal=itemizedPreview([draft("0")],"1","JPY",["a","b"],{tax:{amount:"1",allocation:"EQUAL"},tip:{amount:"",allocation:"PROPORTIONAL"}});
 assert.deepEqual(equal.participants.map(p=>p.amount),[1,0]);
});
test("saved adjustment drafts preserve choices and legacy expenses start without extras",()=>{
 const {adjustmentDrafts}=require("../src/features/expenses/itemized.ts");
 assert.equal(adjustmentDrafts().tax.amount,"");
 assert.deepEqual(adjustmentDrafts({tip:{amount:2,allocation:"EQUAL"}}).tip,{amount:"2",allocation:"EQUAL"});
});
