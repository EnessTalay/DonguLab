export const parseDecimalNumber = (value: string) =>
  Number(value.trim().replace(',', '.'));

export function parsePositiveNumber(value: string): number | null {
  const parsed = parseDecimalNumber(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed < 1e9 ? parsed : null;
}
