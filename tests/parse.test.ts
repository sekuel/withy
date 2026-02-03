import { describe, it, expect } from "vitest";
import { parseSerializedSQL } from "../src/parse.js";
import { loadFixturePayload, listFixtureNames } from "./helpers.js";

describe("parseSerializedSQL", () => {
  const fixtures = listFixtureNames();

  describe("fixture files", () => {
    it.each(fixtures)("parses %s successfully", (fixtureName) => {
      const json = loadFixturePayload(fixtureName);
      const result = parseSerializedSQL(json);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.error).toBe(false);
        expect(result.data.statements).toBeDefined();
        expect(Array.isArray(result.data.statements)).toBe(true);
        expect(result.data.statements!.length).toBeGreaterThanOrEqual(1);
        const validRootTypes = ["SELECT_NODE", "SET_OPERATION_NODE"];
        for (const st of result.data.statements!) {
          expect(validRootTypes).toContain(st.node?.type);
        }
      }
    });
  });

  describe("error cases", () => {
    it("returns error on invalid JSON", () => {
      const result = parseSerializedSQL("not json");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("JSON");
    });

    it("returns error when DuckDB response has error: true", () => {
      const result = parseSerializedSQL(
        '{"error":true,"error_type":"parser","error_message":"syntax error"}'
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("syntax error");
    });

    it("returns error when there are no statements", () => {
      const result = parseSerializedSQL('{"error":false}');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("No statements");
    });
  });
});
