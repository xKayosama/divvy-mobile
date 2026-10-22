import { groupCurrencies } from "./currencies";

const precisions = new Map<string, number>(groupCurrencies.map(currency => [currency.code, currency.minorUnits]));
export function currencyDigits(currency?: string | null) {
  return precisions.get(currency ?? "PHP") ?? 2;
}
export function currencyScale(currency?: string | null) {
  return 10 ** currencyDigits(currency);
}
export function amountPattern(currency?: string | null) {
  const digits = currencyDigits(currency);
  return new RegExp(digits === 0 ? "^\\d+$" : `^\\d+(\\.\\d{1,${digits}})?$`);
}
export function validAmount(value: string, currency?: string | null, allowZero = false) {
  if (!amountPattern(currency).test(value)) return false;
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) return false;
  const digits = currencyDigits(currency);
  const scale = currencyScale(currency);
  const toUnits = (text: string) => {
    const [whole, fraction = ""] = text.split(".");
    return BigInt(whole) * BigInt(scale) + BigInt(fraction.padEnd(digits, "0") || "0");
  };
  const units = toUnits(value);
  return units <= BigInt(Number.MAX_SAFE_INTEGER) &&
    Number.isSafeInteger(Math.round(number * scale)) &&
    toUnits(number.toFixed(digits)) === units;

}
export function amountPrecisionLabel(currency?: string | null) {
  const digits = currencyDigits(currency);
  return digits === 0 ? "whole units" : `up to ${digits} decimal places`;
}
export function formatCurrencyAmount(value: number, currency?: string | null) {
  const digits = currencyDigits(currency);
  // Keep out-of-precision historical records visible for review instead of hiding fractions.
  return new Intl.NumberFormat("en-PH", { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 3) }).format(value);
}
