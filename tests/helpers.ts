import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const fixturesDir = join(import.meta.dirname, "fixtures");

/**
 * List all fixture names (e.g. ["cte.json", "subquery.json"]).
 * Only includes *.json files that are not *.expected.json.
 */
export function listFixtureNames(): string[] {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".expected.json"))
    .sort();
}

/**
 * Load fixture and return the JSON string to pass to parseSerializedSQL.
 * Fixtures may be the raw SerializedSQL object, or an array of one object
 * whose single key is the DuckDB statement and value is the SerializedSQL
 * (for documentation in tests only). Actual usage still expects only the dict.
 */
export function loadFixturePayload(fixtureName: string): string {
  const raw = readFileSync(join(fixturesDir, fixtureName), "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (
    Array.isArray(parsed) &&
    parsed.length > 0 &&
    typeof parsed[0] === "object" &&
    parsed[0] !== null
  ) {
    const keys = Object.keys(parsed[0] as object);
    if (keys.length === 1) {
      const payload = (parsed[0] as Record<string, unknown>)[keys[0]];
      return JSON.stringify(payload);
    }
  }
  return raw;
}

/** Basename without .json (e.g. "cte" from "cte.json"). */
export function fixtureBasename(fixtureName: string): string {
  return fixtureName.replace(/\.json$/, "");
}

/** Path to optional expected lineage file (e.g. cte.expected.json). */
export function expectedPath(fixtureName: string): string {
  return join(fixturesDir, `${fixtureBasename(fixtureName)}.expected.json`);
}
