import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { parseSerializedSQL } from "../src/parse.js";
import { extractLineage } from "../src/lineage.js";
import type { QueryLineage } from "../src/lineage.js";
import {
  loadFixturePayload,
  listFixtureNames,
  expectedPath,
} from "./helpers.js";

function assertValidLineage(lineage: QueryLineage): void {
  expect(lineage.nodes).toBeDefined();
  expect(Array.isArray(lineage.nodes)).toBe(true);
  expect(lineage.edges).toBeDefined();
  expect(Array.isArray(lineage.edges)).toBe(true);
  const nodeIds = new Set(lineage.nodes.map((n) => n.id));
  for (const edge of lineage.edges) {
    expect(nodeIds.has(edge.fromId)).toBe(true);
    expect(nodeIds.has(edge.toId)).toBe(true);
  }
}

describe("extractLineage", () => {
  const fixtures = listFixtureNames();

  describe("fixture files", () => {
    it.each(fixtures)("produces valid lineage for %s", (fixtureName) => {
      const json = loadFixturePayload(fixtureName);
      const parsed = parseSerializedSQL(json);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const lineages = extractLineage(parsed.data);
      expect(lineages.length).toBeGreaterThanOrEqual(1);
      for (const lineage of lineages) {
        assertValidLineage(lineage);
      }
    });

    it.each(
      fixtures.filter((name) => existsSync(expectedPath(name)))
    )("matches %s.expected.json", (fixtureName) => {
      const json = loadFixturePayload(fixtureName);
      const parsed = parseSerializedSQL(json);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const lineages = extractLineage(parsed.data);
      const expected: QueryLineage[] = JSON.parse(
        readFileSync(expectedPath(fixtureName), "utf8")
      );
      expect(lineages).toEqual(expected);
    });
  });

  it("returns empty array when parse result has no statements", () => {
    const lineages = extractLineage({ error: true } as any);
    expect(lineages).toEqual([]);
  });
});
