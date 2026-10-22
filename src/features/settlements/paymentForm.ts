import { validAmount, amountPrecisionLabel } from "../groups/money";
export function localCalendarDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validatePayment(
  amount: string,
  date: string,
  now = new Date(),
  currency = "PHP",
) {
  if (!validAmount(amount, currency))
    return `Enter a positive amount with ${amountPrecisionLabel(currency)}.`;
  const parsed = new Date(`${date}T00:00:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    localCalendarDate(parsed) !== date ||
    parsed > now
  )
    return "Choose a valid payment date that is not in the future.";
  return "";
}

// Created once when reviewing a payment; reuse this token for every retry.
export function createPaymentRequestId() {
  return `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}
