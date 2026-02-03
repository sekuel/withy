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

### Mermaid output

**Library** – get a Mermaid flowchart string from lineage:

```ts
import { parseSerializedSQL, extractLineage, lineageToMermaid } from "withy";

const result = parseSerializedSQL(jsonFromDuckDB);
if (result.ok) {
  const lineages = extractLineage(result.data);
  const mermaid = lineageToMermaid(lineages[0]);
  console.log(mermaid);
  // Multiple statements: lineages.map(lineageToMermaid).join("\n\n---\n\n")
}
```

**CLI** – use `-f mermaid` (or `--format mermaid`) to print Mermaid instead of JSON:

```bash
# From file
node dist/cli.js -f mermaid path/to/duckdb-output.json

# From stdin
echo '{"error":false,"statements":[...]}' | node dist/cli.js --format mermaid
```

With `npx withy` (after `npm link` or install): `npx withy -f mermaid path/to/file.json`.


## Getting input from DuckDB

In DuckDB:

```sql
SELECT json_serialize_sql('SELECT * FROM (SELECT 1 AS x) AS sub');
SELECT json_serialize_sql('WITH cte1 AS (SELECT 1) SELECT * FROM cte1');
```

Use the returned JSON string as input to withy.


### Example

Raw query (DuckDB `json_serialize_sql` input):

```sql
SELECT
    artist_id,
    (SELECT track_name AS t FROM old_tracks) AS scalar_track_name,
    (WITH esq AS (SELECT * FROM def) SELECT id FROM esq),
    COUNT(order_id) AS total_orders
FROM artists
LEFT JOIN tracks USING (artist_id)
LEFT JOIN (SELECT order_id FROM orders)
  USING (track_id)
WHERE track_id
  NOT IN (SELECT track_id FROM old_track_2)
GROUP BY 1,2,3;
```

Run: `node dist/cli.js path/to/duckdb-output.json -f mermaid`

Mermaid output:

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  base_artists[("artists")]
  base_tracks[("tracks")]
  subquery_0[["SQ FROM (orders)"]]
  base_orders[("orders")]
  subquery_1{{"scalar_track_name"}}
  base_old_tracks[("old_tracks")]
  subquery_2{{"SQ FROM (esq)"}}
  cte_esq("esq")
  base_def[("def")]
  subquery_3{{"SQ FROM (old_track_2)"}}
  base_old_track_2[("old_track_2")]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef baseTable fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20,stroke-width:2px
  classDef cte fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  classDef scalarSubquery fill:#fffde7,stroke:#f9a825,color:#f57f17,stroke-width:2px
  class main main
  class base_artists baseTable
  class base_tracks baseTable
  class subquery_0 subquery
  class base_orders baseTable
  class subquery_1 scalarSubquery
  class base_old_tracks baseTable
  class subquery_2 scalarSubquery
  class cte_esq cte
  class base_def baseTable
  class subquery_3 scalarSubquery
  class base_old_track_2 baseTable

  base_artists -->|reads| main
  base_tracks -->|left| main
  subquery_0 -->|left| main
  base_orders -->|reads| subquery_0
  subquery_1 -->|scalar| main
  base_old_tracks -->|reads| subquery_1
  subquery_2 -->|scalar| main
  cte_esq -->|CTE| subquery_2
  base_def -->|reads| cte_esq
  subquery_3 -->|scalar| main
  base_old_track_2 -->|reads| subquery_3
  %% Edge styles by relationship
  linkStyle 0 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 1 stroke:#5c6bc0,stroke-width:2px,color:#3949ab
  linkStyle 2 stroke:#5c6bc0,stroke-width:2px,color:#3949ab
  linkStyle 3 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 4 stroke:#f9a825,stroke-width:2px,color:#f57f17
  linkStyle 5 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 6 stroke:#f9a825,stroke-width:2px,color:#f57f17
  linkStyle 7 stroke:#7b1fa2,stroke-width:2px,color:#4a148c
  linkStyle 8 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 9 stroke:#f9a825,stroke-width:2px,color:#f57f17
  linkStyle 10 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
```

## Scripts

- `npm run build` – compile TypeScript to `dist/`
- `npm run test` – run tests
- `npm run typecheck` – type-check without emitting
