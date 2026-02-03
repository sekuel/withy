#!/usr/bin/env node
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { parseSerializedSQL } from "./parse.js";
import { extractLineage } from "./lineage.js";
import { lineageToMermaid } from "./mermaid.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

/**
 * If JSON is fixture format [{ "statement": payload }], return JSON string of payload; else return as-is.
 * Intentionally catches and ignores parse/shape errors so non-fixture input is passed through unchanged.
 */
function unwrapFixtureFormat(json: string): string {
  try {
    const parsed = JSON.parse(json) as unknown;
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
  } catch {
    /* not valid JSON or wrong shape; fall through to return as-is */
  }
  return json;
}

const args = process.argv.slice(2);
let format: "json" | "mermaid" = "json";
let pathArg: string | null = null;

const help = `Usage: withy [options] [file]
  -f, --format <json|mermaid>  Output format (default: json)
  -h, --help                    Show this help
  -v, --version                 Show version
  If no file is given, read JSON from stdin.`;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    process.stdout.write(help + "\n");
    process.exit(0);
  }
  if (arg === "-v" || arg === "--version") {
    process.stdout.write(`${pkg.version}\n`);
    process.exit(0);
  }
  if (arg === "-f" || arg === "--format") {
    const value = args[i + 1];
    if (value === "mermaid") {
      format = "mermaid";
      i++;
    }
  } else if (!pathArg) {
    pathArg = arg;
  }
}

function run(json: string, outputFormat: "json" | "mermaid"): void {
  const result = parseSerializedSQL(json);
  if (!result.ok) {
    process.stderr.write(`${result.error}\n`);
    process.exit(1);
  }
  const lineages = extractLineage(result.data);
  if (outputFormat === "mermaid") {
    const parts = lineages.map((lineage, idx) => {
      const diagram = lineageToMermaid(lineage);
      if (lineages.length > 1) {
        return `%% Statement ${idx + 1}\n${diagram}`;
      }
      return diagram;
    });
    process.stdout.write(parts.join("\n\n---\n\n") + "\n");
  } else {
    process.stdout.write(JSON.stringify(lineages, null, 2) + "\n");
  }
}

if (pathArg == null) {
  const chunks: Buffer[] = [];
  process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
  process.stdin.on("end", () => {
    run(unwrapFixtureFormat(Buffer.concat(chunks).toString("utf8")), format);
  });
} else {
  try {
    const input = readFileSync(pathArg, "utf8");
    run(unwrapFixtureFormat(input), format);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Error reading file: ${msg}\n`);
    process.exit(1);
  }
}
