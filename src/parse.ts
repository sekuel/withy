import type { SerializedSQL } from "./ast.js";
import { isSerializedSQLSuccess } from "./ast.js";

export type ParseResult =
  | { ok: true; data: SerializedSQL }
  | { ok: false; error: string };

/**
 * Parse JSON output from DuckDB's json_serialize_sql().
 * Returns a result type: success with SerializedSQL or failure with error message.
 * Does not throw; all errors are returned in the result.
 */
export function parseSerializedSQL(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Invalid JSON: ${message}` };
  }

  if (raw === null || typeof raw !== "object") {
    return { ok: false, error: "Expected a JSON object" };
  }

  const root = raw as SerializedSQL;
  if (root.error === true) {
    const msg = root.error_message ?? root.error_type ?? "Unknown DuckDB error";
    return { ok: false, error: String(msg) };
  }

  if (!isSerializedSQLSuccess(root)) {
    return { ok: false, error: "No statements in serialized SQL response" };
  }

  return { ok: true, data: root };
}
