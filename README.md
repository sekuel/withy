# withy

Parse DuckDB's `json_serialize_sql` output to visualize query lineage (CTEs, subqueries).

## Setup

```bash
nvm use   # or ensure Node >= 20
npm install
npm run build
```

## Usage

**Library**

```ts
import { parseSerializedSQL, extractLineage } from "withy";

const result = parseSerializedSQL(jsonFromDuckDB);
if (result.ok) {
  const lineages = extractLineage(result.data);
  // lineages[].nodes, lineages[].edges
  // Edges for JOIN right-hand side include join_type, ref_type, columns (USING or ON columns)
}
```

**CLI** (after `npm run build`)

```bash
# From file
node dist/cli.js path/to/duckdb-output.json

# From stdin
echo '{"error":false,"statements":[...]}' | node dist/cli.js
```

CLI output is a JSON array of `{ nodes, edges }` per statement. Edges that are the right side of a JOIN include `join_type`, `ref_type`, and `columns` when present.

## Getting input from DuckDB

In DuckDB:

```sql
SELECT json_serialize_sql('SELECT * FROM (SELECT 1 AS x) AS sub');
SELECT json_serialize_sql('WITH cte1 AS (SELECT 1) SELECT * FROM cte1');
```

Use the returned JSON string as input to withy.

## Scripts

- `npm run build` – compile TypeScript to `dist/`
- `npm run test` – run tests
- `npm run typecheck` – type-check without emitting
