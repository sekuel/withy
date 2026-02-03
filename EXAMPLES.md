# withy examples

Generated from `tests/fixtures/*.json`.

## cross_join

- Fixture: `tests/fixtures/cross_join.json`

SQL used to generate the payload:

```sql
SELECT * FROM (SELECT 1 AS a) t1 CROSS JOIN (SELECT 2 AS b) t2
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  subquery_0[["t1"]]
  subquery_1[["t2"]]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  class main main
  class subquery_0 subquery
  class subquery_1 subquery

  subquery_0 -->|from subquery| main
  subquery_1 -->|inner| main
  %% Edge styles by relationship
  linkStyle 0 stroke:#e65100,stroke-width:2px,color:#bf360c
  linkStyle 1 stroke:#5c6bc0,stroke-width:2px,color:#3949ab
```

## cte

- Fixture: `tests/fixtures/cte.json`

SQL used to generate the payload:

```sql
WITH cte1 AS (SELECT 1) SELECT * FROM cte1
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  cte_cte1("cte1")
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef cte fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c,stroke-width:2px
  class main main
  class cte_cte1 cte

  cte_cte1 -->|CTE| main
  %% Edge styles by relationship
  linkStyle 0 stroke:#7b1fa2,stroke-width:2px,color:#4a148c
```

## except

- Fixture: `tests/fixtures/except.json`

SQL used to generate the payload:

```sql
SELECT n FROM (SELECT 1 AS n) EXCEPT SELECT n FROM (SELECT 2 AS n)
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  subquery_0[["SQ FROM ()"]]
  subquery_1[["SQ FROM ()"]]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  class main main
  class subquery_0 subquery
  class subquery_1 subquery

  subquery_0 -->|from subquery| main
  subquery_1 -->|from subquery| main
  %% Edge styles by relationship
  linkStyle 0 stroke:#e65100,stroke-width:2px,color:#bf360c
  linkStyle 1 stroke:#e65100,stroke-width:2px,color:#bf360c
```

## having_subquery

- Fixture: `tests/fixtures/having_subquery.json`

SQL used to generate the payload:

```sql
SELECT customer_id, COUNT(*) AS cnt FROM orders GROUP BY customer_id HAVING COUNT(*) > (SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM orders GROUP BY customer_id) t)
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  base_orders[("orders")]
  subquery_0{{"SQ FROM (orders)"}}
  subquery_1[["t"]]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef baseTable fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  classDef scalarSubquery fill:#fffde7,stroke:#f9a825,color:#f57f17,stroke-width:2px
  class main main
  class base_orders baseTable
  class subquery_0 scalarSubquery
  class subquery_1 subquery

  base_orders -->|reads| main
  subquery_0 -->|scalar| main
  subquery_1 -->|from subquery| subquery_0
  base_orders -->|reads| subquery_1
  %% Edge styles by relationship
  linkStyle 0 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 1 stroke:#f9a825,stroke-width:2px,color:#f57f17
  linkStyle 2 stroke:#e65100,stroke-width:2px,color:#bf360c
  linkStyle 3 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
```

## inner_join_on

- Fixture: `tests/fixtures/inner_join_on.json`

SQL used to generate the payload:

```sql
SELECT a.x, b.y FROM (SELECT 1 AS x) a INNER JOIN (SELECT 1 AS y) b ON a.x = b.y
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  subquery_0[["a"]]
  subquery_1[["b"]]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  class main main
  class subquery_0 subquery
  class subquery_1 subquery

  subquery_0 -->|from subquery| main
  subquery_1 -->|inner| main
  %% Edge styles by relationship
  linkStyle 0 stroke:#e65100,stroke-width:2px,color:#bf360c
  linkStyle 1 stroke:#5c6bc0,stroke-width:2px,color:#3949ab
```

## intersect

- Fixture: `tests/fixtures/intersect.json`

SQL used to generate the payload:

```sql
SELECT x FROM (SELECT 1 AS x) INTERSECT SELECT x FROM (SELECT 1 AS x)
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  subquery_0[["SQ FROM ()"]]
  subquery_1[["SQ FROM ()"]]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  class main main
  class subquery_0 subquery
  class subquery_1 subquery

  subquery_0 -->|from subquery| main
  subquery_1 -->|from subquery| main
  %% Edge styles by relationship
  linkStyle 0 stroke:#e65100,stroke-width:2px,color:#bf360c
  linkStyle 1 stroke:#e65100,stroke-width:2px,color:#bf360c
```

## multiple_ctes

- Fixture: `tests/fixtures/multiple_ctes.json`

SQL used to generate the payload:

```sql
WITH a AS (SELECT 1 AS id), b AS (SELECT id FROM a) SELECT * FROM b
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  cte_a("a")
  cte_b("b")
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef cte fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c,stroke-width:2px
  class main main
  class cte_a cte
  class cte_b cte

  cte_a -->|CTE| main
  cte_b -->|CTE| main
  cte_a -->|reads| cte_b
  %% Edge styles by relationship
  linkStyle 0 stroke:#7b1fa2,stroke-width:2px,color:#4a148c
  linkStyle 1 stroke:#7b1fa2,stroke-width:2px,color:#4a148c
  linkStyle 2 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
```

## nested_subqueries

- Fixture: `tests/fixtures/nested_subqueries.json`

SQL used to generate the payload:

```sql
SELECT library_id, location, book_id FROM (SELECT library_id, location FROM (SELECT library_id, location, city FROM libraries)) JOIN (SELECT library_id, book_id FROM books) b ON l.library_id = b.library_id
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  subquery_0[["l"]]
  subquery_1[["SQ FROM (libraries)"]]
  base_libraries[("libraries")]
  subquery_2[["b"]]
  base_books[("books")]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef baseTable fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  class main main
  class subquery_0 subquery
  class subquery_1 subquery
  class base_libraries baseTable
  class subquery_2 subquery
  class base_books baseTable

  subquery_0 -->|from subquery| main
  subquery_1 -->|from subquery| subquery_0
  base_libraries -->|reads| subquery_1
  subquery_2 -->|inner| main
  base_books -->|reads| subquery_2
  %% Edge styles by relationship
  linkStyle 0 stroke:#e65100,stroke-width:2px,color:#bf360c
  linkStyle 1 stroke:#e65100,stroke-width:2px,color:#bf360c
  linkStyle 2 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 3 stroke:#5c6bc0,stroke-width:2px,color:#3949ab
  linkStyle 4 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
```

## qualify

- Fixture: `tests/fixtures/qualify.json`

SQL used to generate the payload:

```sql
SELECT id, val, ROW_NUMBER() OVER (ORDER BY val) AS rn FROM (SELECT 1 AS id, 10 AS val UNION ALL SELECT 2, 20) t QUALIFY rn <= 1
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  subquery_0[["t"]]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  class main main
  class subquery_0 subquery

  subquery_0 -->|from subquery| main
  %% Edge styles by relationship
  linkStyle 0 stroke:#e65100,stroke-width:2px,color:#bf360c
```

## scalar_cte

- Fixture: `tests/fixtures/scalar_cte.json`

SQL used to generate the payload:

```sql
SELECT artist_id, (SELECT track_name AS t FROM old_tracks) AS scalar_track_name, (WITH esq AS (SELECT * FROM def) SELECT id FROM esq), COUNT(order_id) AS total_orders FROM artists LEFT JOIN tracks USING (artist_id) LEFT JOIN (SELECT order_id FROM orders) USING (track_id) WHERE track_id NOT IN (SELECT track_id FROM old_track_2) GROUP BY 1,2,3
```

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

## scalar_order_by

- Fixture: `tests/fixtures/scalar_order_by.json`

SQL used to generate the payload:

```sql
SELECT id, name FROM users ORDER BY (SELECT score FROM config LIMIT 1)
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  base_users[("users")]
  subquery_0{{"SQ FROM (config)"}}
  base_config[("config")]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef baseTable fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20,stroke-width:2px
  classDef scalarSubquery fill:#fffde7,stroke:#f9a825,color:#f57f17,stroke-width:2px
  class main main
  class base_users baseTable
  class subquery_0 scalarSubquery
  class base_config baseTable

  base_users -->|reads| main
  subquery_0 -->|scalar| main
  base_config -->|reads| subquery_0
  %% Edge styles by relationship
  linkStyle 0 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 1 stroke:#f9a825,stroke-width:2px,color:#f57f17
  linkStyle 2 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
```

## subquery

- Fixture: `tests/fixtures/subquery.json`

SQL used to generate the payload:

```sql
SELECT * FROM (SELECT 1 AS x) AS sub
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  subquery_0[["sub"]]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef subquery fill:#fff3e0,stroke:#e65100,color:#bf360c,stroke-width:2px
  class main main
  class subquery_0 subquery

  subquery_0 -->|from subquery| main
  %% Edge styles by relationship
  linkStyle 0 stroke:#e65100,stroke-width:2px,color:#bf360c
```

## table_function_only

- Fixture: `tests/fixtures/table_function_only.json`

SQL used to generate the payload:

```sql
SELECT * FROM generate_series(1, 5) AS gs(i)
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  table_function_0[/"gs"/]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef tableFunction fill:#e0f7fa,stroke:#00838f,color:#006064,stroke-width:2px
  class main main
  class table_function_0 tableFunction

  table_function_0 -->|table function| main
  %% Edge styles by relationship
  linkStyle 0 stroke:#00838f,stroke-width:2px,color:#006064
```

## union

- Fixture: `tests/fixtures/union.json`

SQL used to generate the payload:

```sql
WITH seeds AS (SELECT val FROM generate_series(1,4789) gs(val) UNION SELECT val FROM generate_series(5001,8401) gs(val)), voyages AS (SELECT number FROM 'voyages.csv'), voyages_missing AS (SELECT 'voyages' AS table, seeds.val AS missing_id FROM seeds LEFT JOIN voyages ON seeds.val = voyages.number::INT WHERE voyages.number IS NULL) SELECT * FROM voyages_missing
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  cte_seeds("seeds")
  table_function_0[/"gs"/]
  table_function_1[/"gs"/]
  cte_voyages("voyages")
  base_voyages_csv[("voyages.csv")]
  cte_voyages_missing("voyages_missing")
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef baseTable fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20,stroke-width:2px
  classDef cte fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c,stroke-width:2px
  classDef tableFunction fill:#e0f7fa,stroke:#00838f,color:#006064,stroke-width:2px
  class main main
  class cte_seeds cte
  class table_function_0 tableFunction
  class table_function_1 tableFunction
  class cte_voyages cte
  class base_voyages_csv baseTable
  class cte_voyages_missing cte

  cte_seeds -->|CTE| main
  table_function_0 -->|table function| cte_seeds
  table_function_1 -->|table function| cte_seeds
  cte_voyages -->|CTE| main
  base_voyages_csv -->|reads| cte_voyages
  cte_voyages_missing -->|CTE| main
  cte_seeds -->|reads| cte_voyages_missing
  cte_voyages -->|left| cte_voyages_missing
  %% Edge styles by relationship
  linkStyle 0 stroke:#7b1fa2,stroke-width:2px,color:#4a148c
  linkStyle 1 stroke:#00838f,stroke-width:2px,color:#006064
  linkStyle 2 stroke:#00838f,stroke-width:2px,color:#006064
  linkStyle 3 stroke:#7b1fa2,stroke-width:2px,color:#4a148c
  linkStyle 4 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 5 stroke:#7b1fa2,stroke-width:2px,color:#4a148c
  linkStyle 6 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 7 stroke:#5c6bc0,stroke-width:2px,color:#3949ab
```

## where_exists

- Fixture: `tests/fixtures/where_exists.json`

SQL used to generate the payload:

```sql
SELECT * FROM orders o WHERE EXISTS (SELECT 1 FROM products p WHERE p.id = o.product_id)
```

```mermaid
flowchart TD
  %% Node styles by kind
  main(["main"])
  base_orders[("orders")]
  subquery_0{{"SQ FROM (products)"}}
  base_products[("products")]
  classDef main fill:#e3f2fd,stroke:#1565c0,color:#0d47a1,stroke-width:2px
  classDef baseTable fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20,stroke-width:2px
  classDef scalarSubquery fill:#fffde7,stroke:#f9a825,color:#f57f17,stroke-width:2px
  class main main
  class base_orders baseTable
  class subquery_0 scalarSubquery
  class base_products baseTable

  base_orders -->|reads| main
  subquery_0 -->|scalar| main
  base_products -->|reads| subquery_0
  %% Edge styles by relationship
  linkStyle 0 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
  linkStyle 1 stroke:#f9a825,stroke-width:2px,color:#f57f17
  linkStyle 2 stroke:#2e7d32,stroke-width:2.5px,color:#1b5e20
```
