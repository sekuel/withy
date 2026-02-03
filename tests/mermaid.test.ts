import { describe, it, expect } from "vitest";
import { lineageToMermaid } from "../src/mermaid.js";
import type { QueryLineage } from "../src/lineage.js";
import { parseSerializedSQL } from "../src/parse.js";
import { extractLineage } from "../src/lineage.js";
import { loadFixturePayload } from "./helpers.js";

describe("lineageToMermaid", () => {
  it("returns a string starting with flowchart TD", () => {
    const lineage: QueryLineage = {
      nodes: [{ id: "main", label: "main", kind: "main" }],
      edges: [],
    };
    const out = lineageToMermaid(lineage);
    expect(out).toContain("flowchart TD");
  });

  it("includes sanitized node IDs and edge arrow for minimal lineage", () => {
    const lineage: QueryLineage = {
      nodes: [
        { id: "main", label: "main", kind: "main" },
        { id: "base:users", label: "users", kind: "base_table" },
      ],
      edges: [
        { fromId: "base:users", toId: "main", relationship_kind: "from_table" },
      ],
    };
    const out = lineageToMermaid(lineage);
    expect(out).toContain("flowchart TD");
    expect(out).toContain("main");
    expect(out).toContain("base_users");
    expect(out).toContain("-->");
  });

  it("outputs valid diagram when lineage has only main node (no edges)", () => {
    const lineage: QueryLineage = {
      nodes: [{ id: "main", label: "main", kind: "main" }],
      edges: [],
    };
    const out = lineageToMermaid(lineage);
    expect(out).toContain("flowchart TD");
    expect(out).toContain("main");
    expect(out).not.toContain("-->");
  });

  it("escapes labels with special characters", () => {
    const lineage: QueryLineage = {
      nodes: [
        { id: "main", label: "main", kind: "main" },
        { id: "subquery_0", label: 'SQ FROM "table"', kind: "subquery" },
      ],
      edges: [
        { fromId: "subquery_0", toId: "main", relationship_kind: "from_subquery" },
      ],
    };
    const out = lineageToMermaid(lineage);
    expect(out).toContain("flowchart TD");
    expect(out).toContain("subquery_0");
    expect(out).toContain("#quot;");
  });

  it("produces expected structure for cte fixture", () => {
    const json = loadFixturePayload("cte.json");
    const parsed = parseSerializedSQL(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const lineages = extractLineage(parsed.data);
    expect(lineages.length).toBeGreaterThanOrEqual(1);
    const out = lineageToMermaid(lineages[0]);
    expect(out).toContain("flowchart TD");
    expect(out).toContain("main");
    expect(out).toContain("cte_cte1");
    expect(out).toContain("-->");
  });

  it("produces expected structure for subquery fixture", () => {
    const json = loadFixturePayload("subquery.json");
    const parsed = parseSerializedSQL(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const lineages = extractLineage(parsed.data);
    expect(lineages.length).toBeGreaterThanOrEqual(1);
    const out = lineageToMermaid(lineages[0]);
    expect(out).toContain("flowchart TD");
    expect(out).toContain("main");
    expect(out).toContain("-->");
  });
});
