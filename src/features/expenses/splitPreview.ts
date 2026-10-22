export function splitPreview(
  amount: string,
  splitType: "EQUAL" | "EXACT" | "PERCENTAGE",
  participantIds: string[],
  shares: Record<string, string>,
) {
  const parse = (value: string) => {
    const normalized = value.trim().replace(",", ".");
    const numeric = Number(normalized);
    return /^\d+(\.\d{1,2})?$/.test(normalized) && Number.isSafeInteger(Math.round(numeric * 100))
      ? numeric
      : null;
  };
  const total = parse(amount);
  if (total === null || total <= 0 || participantIds.length === 0) return null;
  const cents = Math.round(total * 100);
  const values = participantIds.map(id => parse(shares[id] ?? ""));
  const assigned = values.reduce<number>((sum, value) => sum + Math.round((value ?? 0) * 100), 0);
  const remaining = splitType === "EQUAL" ? 0 : (splitType === "EXACT" ? cents : 10000) - assigned;
  const complete = splitType === "EQUAL" || (remaining === 0 && values.every(value => value !== null && (splitType !== "PERCENTAGE" || value <= 100)));
  const base = Math.floor((total / participantIds.length) * 100);
  const amounts = participantIds.map((id, index) => {
    if (splitType === "EQUAL") return base + (index === 0 ? cents - base * participantIds.length : 0);
    const value = values[index];
    if (value === null || (splitType === "PERCENTAGE" && value > 100)) return null;
    return splitType === "EXACT" ? Math.round(value * 100) : Math.round(Number((total * value / 100).toFixed(2)) * 100);
  });
  if (splitType === "PERCENTAGE" && complete) {
    const sum = amounts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    amounts[amounts.length - 1] = (amounts[amounts.length - 1] ?? 0) + cents - sum;
  }
  return { complete, remaining, amounts };
}
