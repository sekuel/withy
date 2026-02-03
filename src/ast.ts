/**
 * Types for DuckDB's json_serialize_sql() output.
 * @see https://duckdb.org/docs/stable/data/json/sql_to_and_from_json
 */

/** Root response: either success with statements or error. */
export interface SerializedSQL {
  error: boolean;
  statements?: Statement[];
  error_type?: string;
  error_message?: string;
  error_subtype?: string;
  position?: string;
}

/** Top-level statement node: SELECT or SET operation (UNION etc.). */
export type StatementNode = SelectNode | SetOperationNode;

export interface Statement {
  node: StatementNode;
  named_param_map?: unknown[];
}

export interface SetOperationNode {
  type: "SET_OPERATION_NODE";
  setop_type?: string;
  left?: SelectNode | SetOperationNode;
  right?: SelectNode | SetOperationNode;
  modifiers?: unknown[];
  cte_map?: CTEMap;
  [key: string]: unknown;
}

export interface SelectNode {
  type: "SELECT_NODE";
  modifiers?: unknown[];
  cte_map: CTEMap;
  select_list: SelectListItem[];
  from_table: FromTable;
  where_clause?: unknown | null;
  group_expressions?: unknown[];
  group_sets?: unknown[];
  aggregate_handling?: string;
  having?: unknown | null;
  sample?: unknown | null;
  qualify?: unknown | null;
  query_location?: number;
}

export interface CTEMap {
  map: CTEMapEntry[];
}

/** When CTEs exist, each entry has key (CTE name) and value (with query = Statement wrapper). */
export interface CTEMapEntry {
  key: string;
  value?: {
    query?: Statement;
    aliases?: unknown[];
    materialized?: string;
    key_targets?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Discriminated union for FROM clause: base table, subquery, join, table function, or empty. */
export type FromTable =
  | EmptyTable
  | BaseTable
  | SubqueryTable
  | JoinTable
  | TableFunctionTable
  | UnknownFromTable;

export interface TableFunctionTable {
  type: "TABLE_FUNCTION";
  alias?: string;
  function?: { function_name?: string; [key: string]: unknown };
  query_location?: number;
  [key: string]: unknown;
}

export interface EmptyTable {
  type: "EMPTY";
  alias?: string;
  sample?: unknown | null;
  query_location?: number;
}

export interface BaseTable {
  type: "BASE_TABLE";
  table_name?: string;
  alias?: string;
  schema_name?: string;
  sample?: unknown | null;
  query_location?: number;
}

/** Subquery in FROM; subquery is Statement wrapper { node: SelectNode, named_param_map }. */
export interface SubqueryTable {
  type: "SUBQUERY" | "SUBQUERY_NODE";
  subquery?: Statement;
  query?: SelectNode;
  alias?: string;
  query_location?: number;
  [key: string]: unknown;
}

/** JOIN: left and right are from_table-like. */
export interface JoinTable {
  type: "JOIN" | "CROSS_PRODUCT";
  left?: FromTable;
  right?: FromTable;
  condition?: unknown;
  join_type?: string;
  ref_type?: string;
  using_columns?: string[];
  query_location?: number;
  [key: string]: unknown;
}

/** Catch-all for any from_table shape we don't yet model. */
export interface UnknownFromTable {
  type: string;
  [key: string]: unknown;
}

export interface SelectListItem {
  class?: string;
  type?: string;
  alias?: string;
  query_location?: number;
  /** Column ref: table/alias and column name(s) */
  column_names?: string[];
  /** Scalar/expression subquery in select list */
  subquery?: Statement;
  [key: string]: unknown;
}

/** Type guard: root has successful statements. */
export function isSerializedSQLSuccess(
  root: SerializedSQL
): root is SerializedSQL & { statements: Statement[] } {
  return root.error === false && Array.isArray(root.statements) && root.statements.length > 0;
}

/** Type guard: from_table is a base table. */
export function isBaseTable(from: FromTable): from is BaseTable {
  return from.type === "BASE_TABLE";
}

/** Type guard: from_table is a subquery (has nested select node). */
export function isSubqueryTable(from: FromTable): from is SubqueryTable {
  const t = from.type;
  return t === "SUBQUERY" || t === "SUBQUERY_NODE" || "subquery" in from || "query" in from;
}

/** Type guard: from_table is a join. */
export function isJoinTable(from: FromTable): from is JoinTable {
  return from.type === "JOIN" || from.type === "CROSS_PRODUCT";
}

/** Type guard: from_table is a table function. */
export function isTableFunctionTable(from: FromTable): from is TableFunctionTable {
  return from.type === "TABLE_FUNCTION";
}

/** Type guard: node is a select node (not setop). */
export function isSelectNode(
  node: StatementNode
): node is SelectNode {
  return node.type === "SELECT_NODE";
}

/** Type guard: node is a set operation (UNION etc.). */
export function isSetOperationNode(
  node: StatementNode
): node is SetOperationNode {
  return node.type === "SET_OPERATION_NODE";
}

/** Get the nested SelectNode from a subquery from_table, if any. */
export function getSubquerySelect(from: FromTable): SelectNode | undefined {
  if (!isSubqueryTable(from)) return undefined;
  const sub = from as SubqueryTable;
  const st = sub.subquery;
  if (st && typeof st === "object" && "node" in st && st.node != null && isSelectNode(st.node))
    return st.node;
  return sub.query;
}

/** Get the nested StatementNode (SELECT or SET_OPERATION) from a subquery from_table, if any. */
export function getSubqueryStatement(from: FromTable): StatementNode | undefined {
  if (!isSubqueryTable(from)) return undefined;
  const sub = from as SubqueryTable;
  const st = sub.subquery;
  if (st && typeof st === "object" && "node" in st && st.node != null) return st.node as StatementNode;
  return sub.query as StatementNode | undefined;
}
