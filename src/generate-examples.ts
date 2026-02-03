import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseSerializedSQL } from "./parse.js";
import { extractLineage } from "./lineage.js";
import { lineageToMermaid } from "./mermaid.js";

type FixtureParse =
  | { kind: "wrapped"; statement: string; payloadJson: string }
  | { kind: "raw"; payloadJson: string };

function parseFixture(raw: string): FixtureParse {
  const parsed = JSON.parse(raw) as unknown;
  if (
    Array.isArray(parsed) &&
    parsed.length > 0 &&
    typeof parsed[0] === "object" &&
    parsed[0] !== null
  ) {
    const keys = Object.keys(parsed[0] as object);
    if (keys.length === 1) {
      const statement = keys[0];
      const payload = (parsed[0] as Record<string, unknown>)[statement];
      return { kind: "wrapped", statement, payloadJson: JSON.stringify(payload) };
    }
  }
  return { kind: "raw", payloadJson: raw };
}

function mdEscapeInline(code: string): string {
  // Keep it simple: backtick-wrap, and avoid accidental code fence endings.
  return code.replace(/`/g, "\\`");
}

function listFixtureNames(fixturesDir: string): string[] {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".expected.json"))
    .sort();
}

function fixtureBasename(fixtureName: string): string {
  return fixtureName.replace(/\.json$/, "");
}

function toPosixPath(p: string): string {
  return p.replace(/\\/g, "/");
}

function renderExamples(repoRoot: string, fixturesDir: string): string {
  const names = listFixtureNames(fixturesDir);
  const lines: string[] = [];

  lines.push("# withy examples");
  lines.push("");
  lines.push("Generated from `tests/fixtures/*.json`.");
  lines.push("");

  for (const name of names) {
    const base = fixtureBasename(name);
    const fixturePath = join(fixturesDir, name);
    const fixturePathRel = toPosixPath(relative(repoRoot, fixturePath));
    const raw = readFileSync(fixturePath, "utf8");

    lines.push(`## ${mdEscapeInline(base)}`);
    lines.push("");
    lines.push(`- Fixture: \`${fixturePathRel}\``);
    lines.push("");

    let fixture: FixtureParse;
    try {
      fixture = parseFixture(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lines.push("Could not parse fixture JSON:");
      lines.push("");
      lines.push("```text");
      lines.push(msg);
      lines.push("```");
      lines.push("");
      continue;
    }

    if (fixture.kind === "wrapped") {
      lines.push("DuckDB call used to generate the payload:");
      lines.push("");
      lines.push("```sql");
      lines.push(fixture.statement);
      lines.push("```");
      lines.push("");
    }

    const parsed = parseSerializedSQL(fixture.payloadJson);
    if (!parsed.ok) {
      lines.push("Parse error:");
      lines.push("");
      lines.push("```text");
      lines.push(parsed.error);
      lines.push("```");
      lines.push("");
      continue;
    }

    const lineages = extractLineage(parsed.data);
    if (lineages.length === 0) {
      lines.push("No statements found.");
      lines.push("");
      continue;
    }

    for (let i = 0; i < lineages.length; i++) {
      if (lineages.length > 1) {
        lines.push(`### Statement ${i + 1}`);
        lines.push("");
      }
      const diagram = lineageToMermaid(lineages[i]);
      lines.push("```mermaid");
      lines.push(diagram);
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function main(): void {
  const repoRoot = join(import.meta.dirname, "..");
  const fixturesDir = join(repoRoot, "tests", "fixtures");
  const outPath = join(repoRoot, "EXAMPLES.md");

  const md = renderExamples(repoRoot, fixturesDir);
  writeFileSync(outPath, md, "utf8");
  process.stdout.write(`Wrote ${outPath}\n`);
}

main();
