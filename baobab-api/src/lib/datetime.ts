type Neo4jTemporal = {
  year: number | { low: number; high: number };
  month: number | { low: number; high: number };
  day: number | { low: number; high: number };
  hour?: number | { low: number; high: number };
  minute?: number | { low: number; high: number };
  second?: number | { low: number; high: number };
};

function part(value: number | { low: number; high: number } | undefined): number {
  if (value === undefined) return 0;
  return typeof value === "number" ? value : value.low;
}

export function toEpochMs(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && value !== null && "year" in value) {
    const t = value as Neo4jTemporal;
    return Date.UTC(
      part(t.year),
      part(t.month) - 1,
      part(t.day),
      part(t.hour),
      part(t.minute),
      part(t.second)
    );
  }
  return 0;
}
