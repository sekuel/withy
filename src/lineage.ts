import type {
  SerializedSQL,
  SelectNode,
  StatementNode,
  FromTable,
  CTEMapEntry,
} from "./ast.js";
import {
  isSerializedSQLSuccess,
  isBaseTable,
  isSubqueryTable,
  isJoinTable,
  isTableFunctionTable,
  isSelectNode,
  isSetOperationNode,
  getSubquerySelect,
  getSubqueryStatement,
} from "./ast.js";

export type LineageNodeKind = "main" | "cte" | "subquery" | "scalar_subquery" | "base_table" | "table_function";

export interface LineageNode {
  id: string;
  label: string;
  kind: LineageNodeKind;
  /** Table/alias name used in the query (e.g. in JOIN ON or column refs). */
  alias?: string;
  query_location?: number;
  /** Output column names/aliases from this node’s SELECT list (for main, cte, subquery, scalar_subquery). */
  select_list?: string[];
}

export type EdgeRelationshipKind =
  | "cte"
  | "from_table"
  | "from_subquery"
  | "join"
  | "from_table_function"
  | "scalar_subquery";

export interface LineageEdge {
  fromId: string;
  toId: string;
  /** What kind of relationship this edge represents. */
  relationship_kind: EdgeRelationshipKind;
  /** When edge is under a set operation (UNION/INTERSECT/EXCEPT). */
  setop_type?: string;
  setop_side?: "left" | "right";
  /** Set when relationship_kind is "join". */
  join_type?: string;
  ref_type?: string;
  /** USING columns or ON condition column refs. */
  columns?: string[];
  left_alias?: string;
  right_alias?: string;
  condition_class?: string;
  condition_type?: string;
}

export interface QueryLineage {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

function nextSubqueryId(): () => string {
  let n = 0;
  return () => `subquery_${n++}`;
}

function nextTableFunctionId(): () => string {
  let n = 0;
  return () => `table_function_${n++}`;
}

function getConditionColumns(condition: unknown): string[] | undefined {
  if (!condition || typeof condition !== "object") return undefined;
  const c = condition as { left?: { column_names?: string[] }; right?: { column_names?: string[] } };
  const left = c.left?.column_names;
  const right = c.right?.column_names;
  if (left?.length || right?.length) {
    const parts: string[] = [];
    if (left?.length) parts.push(left.join("."));
    if (right?.length) parts.push(right.join("."));
    return parts.length ? parts : undefined;
  }
  return undefined;
}

/** Resolve alias/label for a FROM table so column refs (e.g. l.library_id) can be interpreted. */
function getFromTableAlias(from: FromTable): string | undefined {
  if (isBaseTable(from)) return (from.alias && from.alias.trim() !== "" ? from.alias : from.table_name) ?? undefined;
  if (isSubqueryTable(from)) return (from as { alias?: string }).alias?.trim() !== "" ? (from as { alias?: string }).alias : undefined;
  if (isTableFunctionTable(from))
    return from.alias ?? (from.function && typeof from.function.function_name === "string" ? from.function.function_name : undefined);
  return undefined;
}

/** When JOIN FROM aliases are empty, derive left/right alias from ON condition column refs (e.g. l.library_id → l). */
function getConditionAliases(condition: unknown): { left_alias?: string; right_alias?: string } {
  if (!condition || typeof condition !== "object") return {};
  const c = condition as { left?: { column_names?: string[] }; right?: { column_names?: string[] } };
  const leftNames = c.left?.column_names;
  const rightNames = c.right?.column_names;
  const out: { left_alias?: string; right_alias?: string } = {};
  if (leftNames?.length && leftNames.length > 1) out.left_alias = leftNames[0];
  if (rightNames?.length && rightNames.length > 1) out.right_alias = rightNames[0];
  return out;
}

type JoinInfo = {
  join_type?: string;
  ref_type?: string;
  columns?: string[];
  left_alias?: string;
  right_alias?: string;
  condition_class?: string;
  condition_type?: string;
};

type SetopContext = { setop_type: string; setop_side: "left" | "right" };

function getParentLabel(nodes: LineageNode[], parentId: string): string | undefined {
  return nodes.find((n) => n.id === parentId)?.label;
}

/** Extract output column labels from a SelectNode’s select_list (alias, column ref, *, or placeholder). */
function getSelectListLabels(selectNode: SelectNode): string[] {
  const out: string[] = [];
  for (const item of selectNode.select_list ?? []) {
    const alias = typeof item.alias === "string" ? item.alias.trim() : "";
    if (alias !== "") {
      out.push(alias);
      continue;
    }
    const col = item.column_names;
    if (Array.isArray(col) && col.length > 0) {
      out.push(col.join("."));
      continue;
    }
    const type = item.type ?? item.class;
    if (type === "STAR") {
      out.push("*");
      continue;
    }
    if (item.subquery) {
      out.push("(scalar)");
      continue;
    }
    out.push("(expr)");
  }
  return out;
}

/** Label for subqueries without alias: "SQ FROM (source)" or "SQ FROM ()" when no source. */
function formatSqFromLabel(sourceLabel: string | undefined): string {
  return sourceLabel != null && sourceLabel !== "" ? `SQ FROM (${sourceLabel})` : "SQ FROM ()";
}

/** Primary source label of a FROM clause (leftmost table/CTE/function name). Used for "SQ FROM (x)" labels. */
function getPrimarySourceLabelFromFromTable(from: FromTable): string | undefined {
  if (isBaseTable(from)) return from.table_name?.trim() ? from.table_name : undefined;
  if (isSubqueryTable(from)) {
    const sub = getSubquerySelect(from);
    return sub ? getPrimarySourceLabelFromSelect(sub) : undefined;
  }
  if (isJoinTable(from) && from.left) return getPrimarySourceLabelFromFromTable(from.left);
  if (isTableFunctionTable(from))
    return from.function && typeof from.function.function_name === "string" ? from.function.function_name : "table_function";
  return undefined;
}

function getPrimarySourceLabelFromSelect(node: SelectNode): string | undefined {
  if (!node.from_table) return undefined;
  return getPrimarySourceLabelFromFromTable(node.from_table);
}

/** Recursively find subqueries in an expression (e.g. where_clause, having) and add nodes/edges. */
function collectSubqueriesFromExpression(
  expr: unknown,
  parentId: string,
  parentLabel: string,
  nodes: LineageNode[],
  edges: LineageEdge[],
  nextSub: () => string,
  nextTf: () => string,
  visitSelect: (node: SelectNode, parentId: string, parentLabel: string, nodes: LineageNode[], edges: LineageEdge[], nextSub: () => string, nextTf: () => string, setopContext?: SetopContext) => void,
  setopContext?: SetopContext
): void {
  if (expr === null || expr === undefined) return;
  if (typeof expr !== "object") return;
  const obj = expr as Record<string, unknown>;

  const subSt = obj.subquery;
  const subNode = subSt && typeof subSt === "object" && "node" in subSt ? (subSt as { node: StatementNode }).node : undefined;
  if (subNode && isSelectNode(subNode)) {
    const id = nextSub();
    const label = formatSqFromLabel(getPrimarySourceLabelFromSelect(subNode));
      nodes.push({
        id,
        label,
        kind: "scalar_subquery",
        query_location: (obj.query_location as number) ?? undefined,
        select_list: getSelectListLabels(subNode),
      });
    const e: LineageEdge = { fromId: id, toId: parentId, relationship_kind: "scalar_subquery" };
    if (setopContext) {
      e.setop_type = setopContext.setop_type;
      e.setop_side = setopContext.setop_side;
    }
    edges.push(e);
    visitSelect(subNode, id, label, nodes, edges, nextSub, nextTf, setopContext);
  }

  if (Array.isArray(obj.children)) {
    for (const child of obj.children) collectSubqueriesFromExpression(child, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
  }
  if (obj.child !== undefined) collectSubqueriesFromExpression(obj.child, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
  if (obj.left !== undefined) collectSubqueriesFromExpression(obj.left, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
  if (obj.right !== undefined) collectSubqueriesFromExpression(obj.right, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
  if (obj.expression !== undefined) collectSubqueriesFromExpression(obj.expression, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
  if (obj.condition !== undefined) collectSubqueriesFromExpression(obj.condition, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
}

function extractFromTable(
  from: FromTable,
  parentId: string,
  nodes: LineageNode[],
  edges: LineageEdge[],
  nextSub: () => string,
  nextTf: () => string,
  visitSelect: (node: SelectNode, parentId: string, label: string) => void,
  joinInfo?: JoinInfo,
  aliasOverride?: string,
  setopContext?: SetopContext
): void {
  const resolvedAlias = () => aliasOverride ?? getFromTableAlias(from);
  /** Edge from source (table/cte/subquery) to consumer (parent select). */
  const pushEdge = (sourceId: string, relationship_kind: EdgeRelationshipKind, joinFields?: JoinInfo) => {
    const e: LineageEdge = { fromId: sourceId, toId: parentId, relationship_kind };
    if (setopContext) {
      e.setop_type = setopContext.setop_type;
      e.setop_side = setopContext.setop_side;
    }
    if (joinFields?.join_type !== undefined) e.join_type = joinFields.join_type;
    if (joinFields?.ref_type !== undefined) e.ref_type = joinFields.ref_type;
    if (joinFields?.columns !== undefined) e.columns = joinFields.columns;
    if (joinFields?.left_alias !== undefined) e.left_alias = joinFields.left_alias;
    if (joinFields?.right_alias !== undefined) e.right_alias = joinFields.right_alias;
    if (joinFields?.condition_class !== undefined) e.condition_class = joinFields.condition_class;
    if (joinFields?.condition_type !== undefined) e.condition_type = joinFields.condition_type;
    edges.push(e);
  };

  if (isBaseTable(from)) {
    const tableName = from.table_name ?? "base_table";
    const cteId = `cte:${tableName}`;
    const baseId = `base:${tableName}`;
    const existingCte = nodes.some((nd) => nd.id === cteId);
    if (!existingCte && !nodes.some((nd) => nd.id === baseId)) {
      const alias = resolvedAlias();
      nodes.push({
        id: baseId,
        label: tableName,
        kind: "base_table",
        ...(alias !== undefined && { alias }),
        query_location: from.query_location,
      });
    }
    const kind: EdgeRelationshipKind = joinInfo ? "join" : "from_table";
    if (!existingCte) {
      pushEdge(baseId, kind, joinInfo);
    } else if (!edges.some((e) => e.fromId === cteId && e.toId === parentId)) {
      pushEdge(cteId, kind, joinInfo);
    }
    return;
  }

  if (isSubqueryTable(from)) {
    const stmt = getSubqueryStatement(from);
    if (stmt) {
      const id = nextSub();
      const alias = resolvedAlias();
      const fromAlias = (from as { alias?: string }).alias;
      const hasAlias = alias !== undefined || (fromAlias && fromAlias.trim() !== "");
      const label = hasAlias
        ? (alias ?? fromAlias ?? id)
        : isSelectNode(stmt)
          ? formatSqFromLabel(getPrimarySourceLabelFromSelect(stmt))
          : formatSqFromLabel(getParentLabel(nodes, parentId));
      nodes.push({
        id,
        label,
        kind: "subquery",
        ...(alias !== undefined && { alias }),
        query_location: from.query_location,
        ...(isSelectNode(stmt) && { select_list: getSelectListLabels(stmt) }),
      });
      pushEdge(id, joinInfo ? "join" : "from_subquery", joinInfo);
      visitNode(stmt, id, label, nodes, edges, nextSub, nextTf, setopContext);
    }
    return;
  }

  if (isJoinTable(from)) {
    const cond = from.condition;
    const condObj = cond && typeof cond === "object" ? (cond as { class?: string; type?: string }) : null;
    const condAliases = getConditionAliases(from.condition);
    const joinMeta: JoinInfo = {
      join_type: from.join_type,
      ref_type: from.ref_type,
      columns:
        Array.isArray(from.using_columns) && from.using_columns.length > 0
          ? from.using_columns
          : getConditionColumns(from.condition),
      left_alias: (from.left ? getFromTableAlias(from.left) : undefined) ?? condAliases.left_alias,
      right_alias: (from.right ? getFromTableAlias(from.right) : undefined) ?? condAliases.right_alias,
      condition_class: condObj?.class,
      condition_type: condObj?.type,
    };
    if (from.left) extractFromTable(from.left, parentId, nodes, edges, nextSub, nextTf, visitSelect, undefined, condAliases.left_alias, setopContext);
    if (from.right) extractFromTable(from.right, parentId, nodes, edges, nextSub, nextTf, visitSelect, joinMeta, condAliases.right_alias, setopContext);
    return;
  }

  if (isTableFunctionTable(from)) {
    const label =
      from.alias ||
      (from.function && typeof from.function.function_name === "string"
        ? from.function.function_name
        : "table_function");
    const id = nextTf();
    const alias = resolvedAlias();
    nodes.push({
      id,
      label,
      kind: "table_function",
      ...(alias !== undefined && { alias }),
      query_location: from.query_location,
    });
    pushEdge(id, joinInfo ? "join" : "from_table_function", joinInfo);
    return;
  }
  // EmptyTable / UnknownFromTable: no lineage nodes or edges
}

function visitNode(
  node: StatementNode,
  parentId: string,
  _blockLabel: string,
  nodes: LineageNode[],
  edges: LineageEdge[],
  nextSub: () => string,
  nextTf: () => string,
  setopContext?: SetopContext
): void {
  if (isSelectNode(node)) {
    visitSelect(node, parentId, _blockLabel, nodes, edges, nextSub, nextTf, setopContext);
    return;
  }
  if (isSetOperationNode(node)) {
    const setopType = node.setop_type ?? "UNION";
    if (node.left) visitNode(node.left, parentId, _blockLabel, nodes, edges, nextSub, nextTf, { setop_type: setopType, setop_side: "left" });
    if (node.right) visitNode(node.right, parentId, _blockLabel, nodes, edges, nextSub, nextTf, { setop_type: setopType, setop_side: "right" });
  }
}

function visitSelect(
  node: SelectNode,
  parentId: string,
  _blockLabel: string,
  nodes: LineageNode[],
  edges: LineageEdge[],
  nextSub: () => string,
  nextTf: () => string,
  setopContext?: SetopContext
): void {
  const cteMap = node.cte_map?.map;
  if (Array.isArray(cteMap)) {
    for (const entry of cteMap as CTEMapEntry[]) {
      const alias = entry.key ?? "cte";
      const st = entry.value?.query;
      const queryNode = st && typeof st === "object" && "node" in st ? (st as { node: StatementNode }).node : undefined;
      if (queryNode) {
        const cteId = `cte:${alias}`;
        if (!nodes.some((nd) => nd.id === cteId)) {
          nodes.push({
            id: cteId,
            label: alias,
            kind: "cte",
            alias,
            query_location: isSelectNode(queryNode) ? queryNode.query_location : undefined,
            ...(isSelectNode(queryNode) && { select_list: getSelectListLabels(queryNode) }),
          });
        }
        const e: LineageEdge = { fromId: cteId, toId: parentId, relationship_kind: "cte" };
        if (setopContext) {
          e.setop_type = setopContext.setop_type;
          e.setop_side = setopContext.setop_side;
        }
        edges.push(e);
        visitNode(queryNode, cteId, alias, nodes, edges, nextSub, nextTf);
      }
    }
  }

  const from = node.from_table;
  if (from) {
    extractFromTable(from, parentId, nodes, edges, nextSub, nextTf, (child, pid, label) => {
      visitSelect(child, pid, label, nodes, edges, nextSub, nextTf, setopContext);
    }, undefined, undefined, setopContext);
  }

  for (const item of node.select_list ?? []) {
    const subSt = item.subquery;
    const subNode = subSt && typeof subSt === "object" && "node" in subSt ? (subSt as { node: StatementNode }).node : undefined;
    if (subNode && isSelectNode(subNode)) {
      const id = nextSub();
      const itemAlias = typeof item.alias === "string" ? item.alias : undefined;
      const hasAlias = itemAlias !== undefined && itemAlias.trim() !== "";
      const label = hasAlias ? itemAlias : formatSqFromLabel(getPrimarySourceLabelFromSelect(subNode));
      nodes.push({
        id,
        label,
        kind: "scalar_subquery",
        ...(hasAlias && { alias: itemAlias }),
        query_location: item.query_location as number | undefined,
        select_list: getSelectListLabels(subNode),
      });
      const e: LineageEdge = { fromId: id, toId: parentId, relationship_kind: "scalar_subquery" };
      if (setopContext) {
        e.setop_type = setopContext.setop_type;
        e.setop_side = setopContext.setop_side;
      }
      edges.push(e);
      visitSelect(subNode, id, label, nodes, edges, nextSub, nextTf, setopContext);
    }
  }

  const parentLabel = getParentLabel(nodes, parentId) ?? parentId;
  collectSubqueriesFromExpression(node.where_clause, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
  collectSubqueriesFromExpression(node.having, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
  collectSubqueriesFromExpression(node.qualify, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);

  // ORDER BY (and other modifiers) can contain scalar subqueries
  const modifiers = node.modifiers;
  if (Array.isArray(modifiers)) {
    for (const mod of modifiers) {
      const m = mod as { type?: string; orders?: Array<{ expression?: unknown }> };
      if (m.type === "ORDER_MODIFIER" && Array.isArray(m.orders)) {
        for (const ord of m.orders) {
          if (ord.expression !== undefined) {
            collectSubqueriesFromExpression(ord.expression, parentId, parentLabel, nodes, edges, nextSub, nextTf, visitSelect, setopContext);
          }
        }
      }
    }
  }
}

/**
 * Extract CTE and subquery lineage from parsed DuckDB serialized SQL.
 * Returns one QueryLineage per statement.
 */
export function extractLineage(serialized: SerializedSQL): QueryLineage[] {
  if (!isSerializedSQLSuccess(serialized)) {
    return [];
  }

  const results: QueryLineage[] = [];

  for (let i = 0; i < serialized.statements.length; i++) {
    const st = serialized.statements[i];
    const node = st?.node;
    if (!node) continue;

    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];
    const mainId = "main";
    nodes.push({
      id: mainId,
      label: "main",
      kind: "main",
      query_location: (node as { query_location?: number }).query_location,
      ...(isSelectNode(node) && { select_list: getSelectListLabels(node) }),
    });

    const nextSub = nextSubqueryId();
    const nextTf = nextTableFunctionId();
    if (isSelectNode(node)) {
      visitSelect(node, mainId, "main", nodes, edges, nextSub, nextTf, undefined);
    } else if (isSetOperationNode(node)) {
      visitNode(node, mainId, "main", nodes, edges, nextSub, nextTf, undefined);
    }

    results.push({ nodes, edges });
  }

  return results;
}
