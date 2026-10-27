/** Map a temperature to the wardrobe season bands it suits. Pure, client-safe. */
export function tempToSeasonBands(tempC: number): string[] {
  if (tempC >= 23) return ["summer"];
  if (tempC >= 15) return ["spring", "fall", "summer"];
  if (tempC >= 5) return ["fall", "winter", "spring"];
  return ["winter"];
}
