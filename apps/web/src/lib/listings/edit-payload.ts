export function normalizeEditEngineVolume(fuelType: string, engineVolumeL: unknown): number | null {
  if (fuelType === "electric" || typeof engineVolumeL !== "string") return null;
  const value = engineVolumeL.trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
