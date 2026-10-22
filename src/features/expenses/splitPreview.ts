import { currencyScale, validAmount } from "../groups/money";

export function splitPreview(
  amount: string,
  splitType: "EQUAL" | "EXACT" | "PERCENTAGE",
  participantIds: string[],
  shares: Record<string, string>,
  currency = "PHP",
) {
  const parse = (value: string, percentage = false) => {
    const normalized = value.trim().replace(",", ".");
    return validAmount(normalized, percentage ? "PHP" : currency, true) ? Number(normalized) : null;
  };
  const total = parse(amount);
  if (total === null || total <= 0 || participantIds.length === 0) return null;
  const scale = currencyScale(currency);
  const units = Math.round(total * scale);
  const shareScale = splitType === "PERCENTAGE" ? 100 : scale;
  const values = participantIds.map(id => parse(shares[id] ?? "", splitType === "PERCENTAGE"));
  const assigned = values.reduce<number>((sum, value) => sum + Math.round((value ?? 0) * shareScale), 0);
  const remaining = splitType === "EQUAL" ? 0 : (splitType === "EXACT" ? units : 10000) - assigned;
  const complete = splitType === "EQUAL" || (remaining === 0 && values.every(value => value !== null && (splitType !== "PERCENTAGE" || value <= 100)));
  const base = Math.floor(units / participantIds.length);
  const amounts = participantIds.map((id, index) => {
    if (splitType === "EQUAL") return base + (index === 0 ? units - base * participantIds.length : 0);
    const value = values[index];
    if (value === null || (splitType === "PERCENTAGE" && value > 100)) return null;
    return splitType === "EXACT" ? Math.round(value * scale) : Number((BigInt(units) * BigInt(Math.round(value * 100)) + 5000n) / 10000n);
  });
  if (splitType === "PERCENTAGE" && complete) {
    const sum = amounts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    amounts[amounts.length - 1] = (amounts[amounts.length - 1] ?? 0) + units - sum;
    // Very small totals can make the final rounding adjustment negative.
    // Redistribute that excess from earlier participants without losing units.
    let excess = Math.max(0, -(amounts[amounts.length - 1] ?? 0));
    if (excess) amounts[amounts.length - 1] = 0;
    for (let index = amounts.length - 2; index >= 0 && excess; index--) {
      const reduction = Math.min(amounts[index] ?? 0, excess);
      amounts[index] = (amounts[index] ?? 0) - reduction;
      excess -= reduction;
    }
  }
  return { complete, remaining, amounts };
}
