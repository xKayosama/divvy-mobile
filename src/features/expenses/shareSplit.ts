export const MAX_SHARE_WEIGHT = 1_000_000;
export function parseShareWeight(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const weight = Number(value.trim());
  return Number.isSafeInteger(weight) &&
    weight >= 1 &&
    weight <= MAX_SHARE_WEIGHT
    ? weight
    : null;
}

// Largest-remainder allocation in integer currency minor units; ties keep participant order.
export function splitByShares(totalUnits: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, value) => sum + BigInt(value), 0n);
  const divisions = weights.map((weight, index) => {
    const numerator = BigInt(totalUnits) * BigInt(weight);
    return {
      index,
      units: numerator / totalWeight,
      remainder: numerator % totalWeight,
    };
  });
  const remaining =
    BigInt(totalUnits) - divisions.reduce((sum, part) => sum + part.units, 0n);
  const ordered = [...divisions].sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (let index = 0; index < Number(remaining); index++)
    ordered[index].units++;
  return divisions.map((part) => Number(part.units));
}
