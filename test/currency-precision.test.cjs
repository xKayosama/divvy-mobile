const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { currencyDigits, validAmount, formatCurrencyAmount } = require('../src/features/groups/money.ts');
const { groupCurrencies } = require('../src/features/groups/currencies.ts');
const { validatePayment } = require('../src/features/settlements/paymentForm.ts');
const { validateBillFields } = require('../src/features/bills/billForm.ts');
const { receiptDraft } = require('../src/features/receipts/receiptDraft.ts');

for (const [currency, digits, valid, invalid, display] of [
  ['JPY', 0, '1', '1.1', '1'], ['PHP', 2, '0.01', '0.001', '0.01'], ['KWD', 3, '0.001', '0.0001', '0.001'],
]) {
  test(`${currency} uses native precision in amounts, bills, payments and display`, () => {
    assert.equal(currencyDigits(currency), digits);
    assert.ok(validAmount(valid, currency));
    assert.ok(!validAmount(invalid, currency));
    for (const value of ['-1', '0', 'NaN', 'Infinity', '1e3', '', '900719925474099100']) assert.ok(!validAmount(value, currency));
    assert.equal(formatCurrencyAmount(Number(valid), currency), display);
    assert.deepEqual(validateBillFields('Bill', valid, '2026-10-21', currency), {});
    assert.ok(validateBillFields('Bill', invalid, '2026-10-21', currency).amount);
    assert.equal(validatePayment(valid, '2026-10-21', new Date('2026-10-22T12:00:00'), currency), '');
    assert.match(validatePayment(invalid, '2026-10-21', new Date('2026-10-22T12:00:00'), currency), /positive amount/);
  });
}
test('catalog contains 155 unique current ISO codes and valid precisions', () => {
  assert.equal(groupCurrencies.length, 155);
  assert.equal(new Set(groupCurrencies.map(c => c.code)).size, 155);
  assert.ok(groupCurrencies.every(c => /^[A-Z]{3}$/.test(c.code) && [0, 2, 3].includes(c.minorUnits) && c.flag));
});
test('receipt prefill preserves three decimals and excess precision for explicit correction', () => {
  const receipt = { merchant: 'Store', date: null, currency: 'KWD', items: [], total: .001 };
  assert.equal(receiptDraft(receipt).amount, '0.001');
  assert.equal(receiptDraft({ ...receipt, currency: 'JPY', total: 100 }).amount, '100');
  assert.equal(receiptDraft({ ...receipt, currency: 'JPY', total: 100.25 }).amount, '100.25');
  assert.equal(receiptDraft({ ...receipt, total: .0001 }).amount, '0.0001');
});


test('large values are rejected when conversion to a number loses a minor unit', () => {
  assert.equal(validAmount('9007199254740.991', 'KWD'), false);
  assert.equal(validAmount('1000000.001', 'KWD'), true);
  assert.equal(formatCurrencyAmount(1.25, 'JPY'), '1.25');
});
