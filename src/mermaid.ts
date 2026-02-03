import type { QueryLineage, LineageNode, LineageEdge } from "./lineage.js";
import type { LineageNodeKind } from "./lineage.js";

/** Mermaid flowchart node IDs must be alphanumeric and underscores. */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

/** Escape label for Mermaid node: use inside ["..."]; escape " and remove [ ] so parser does not break. */
function escapeLabel(label: string): string {
  return label
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "#quot;")
    .replace(/[[\]]/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Mermaid shape syntax per node kind: open and close brackets around label. */
function shapeForKind(kind: LineageNodeKind): { open: string; close: string } {
  switch (kind) {
    case "main":
      return { open: "([", close: "])" }; // stadium – query result
    case "base_table":
      return { open: "[(", close: ")]" }; // cylinder – data source
    case "cte":
      return { open: "(", close: ")" }; // rounded
    case "subquery":
      return { open: "[[", close: "]]" }; // subroutine – nested block
    case "scalar_subquery":
      return { open: "{{", close: "}}" }; // hexagon – scalar value
    case "table_function":
      return { open: "[/", close: "/]" }; // parallelogram – function
    default:
      return { open: "[", close: "]" };
  }
}

/** CSS class names and colors per node kind (used in classDef). */
const STYLES: Record<LineageNodeKind, { class: string; fill: string; stroke: string; color: string }> = {
  main: { class: "main", fill: "#e3f2fd", stroke: "#1565c0", color: "#0d47a1" },
  base_table: { class: "baseTable", fill: "#e8f5e9", stroke: "#2e7d32", color: "#1b5e20" },
  cte: { class: "cte", fill: "#f3e5f5", stroke: "#7b1fa2", color: "#4a148c" },
  subquery: { class: "subquery", fill: "#fff3e0", stroke: "#e65100", color: "#bf360c" },
  scalar_subquery: { class: "scalarSubquery", fill: "#fffde7", stroke: "#f9a825", color: "#f57f17" },
  table_function: { class: "tableFunction", fill: "#e0f7fa", stroke: "#00838f", color: "#006064" },
};

/** Format a single node for Mermaid with shape by kind and escaped label. */
function formatNode(node: LineageNode, sanitizedId: string): string {
  const escaped = escapeLabel(node.label);
  const { open, close } = shapeForKind(node.kind);
  return `  ${sanitizedId}${open}"${escaped}"${close}`;
}

/** Human-friendly label for an edge (relationship_kind or join_type). */
function edgeLabel(edge: LineageEdge): string {
  if (edge.relationship_kind === "join" && edge.join_type) {
    return edge.join_type.replace(/_/g, " ").toLowerCase();
  }
  const labels: Record<string, string> = {
    from_table: "reads",
    from_subquery: "from subquery",
    scalar_subquery: "scalar",
    from_table_function: "table function",
    cte: "CTE",
    join: "join",
  };
  return labels[edge.relationship_kind] ?? edge.relationship_kind;
}

/** Stroke and label color per relationship (for linkStyle). */
const EDGE_STYLES: Record<string, { stroke: string; width: string; color: string }> = {
  from_table: { stroke: "#2e7d32", width: "2.5px", color: "#1b5e20" },
  from_subquery: { stroke: "#e65100", width: "2px", color: "#bf360c" },
  scalar_subquery: { stroke: "#f9a825", width: "2px", color: "#f57f17" },
  from_table_function: { stroke: "#00838f", width: "2px", color: "#006064" },
  cte: { stroke: "#7b1fa2", width: "2px", color: "#4a148c" },
  join: { stroke: "#5c6bc0", width: "2px", color: "#3949ab" },
};

/** Format a single edge with human-friendly label. */
function formatEdge(
  fromId: string,
  toId: string,
  edge: LineageEdge
): string {
  const label = edgeLabel(edge);
  const labelPart = label ? `|${escapeLabel(label)}|` : "";
  return `  ${fromId} -->${labelPart} ${toId}`;
}

/**
 * Convert a single QueryLineage (nodes + edges) into a Mermaid flowchart string.
 * Uses top-down direction, distinct shapes and colors per node kind, and sanitized IDs/labels.
 */
export function lineageToMermaid(lineage: QueryLineage): string {
  const idMap = new Map<string, string>();
  for (const node of lineage.nodes) {
    idMap.set(node.id, sanitizeId(node.id));
  }

  const lines: string[] = [
    "flowchart TD",
    "  %% Node styles by kind",
  ];

  for (const node of lineage.nodes) {
    const sid = idMap.get(node.id) ?? sanitizeId(node.id);
    lines.push(formatNode(node, sid));
  }

  const kindsUsed = new Set(lineage.nodes.map((n) => n.kind));
  for (const kind of Object.keys(STYLES) as LineageNodeKind[]) {
    if (!kindsUsed.has(kind)) continue;
    const s = STYLES[kind];
    lines.push(
      `  classDef ${s.class} fill:${s.fill},stroke:${s.stroke},color:${s.color},stroke-width:2px`
    );
  }

  for (const node of lineage.nodes) {
    const sid = idMap.get(node.id) ?? sanitizeId(node.id);
    const style = STYLES[node.kind];
    if (style) lines.push(`  class ${sid} ${style.class}`);
  }

  const edgeLines: string[] = [];
  const styledEdges: LineageEdge[] = [];
  for (const edge of lineage.edges) {
    const fromId = idMap.get(edge.fromId);
    const toId = idMap.get(edge.toId);
    if (fromId != null && toId != null) {
      edgeLines.push(formatEdge(fromId, toId, edge));
      styledEdges.push(edge);
    }
  }
  lines.push("");
  lines.push(...edgeLines);

  if (styledEdges.length > 0) {
    lines.push("  %% Edge styles by relationship");
    const defaultStyle = { stroke: "#546e7a", width: "2px", color: "#37474f" };
    styledEdges.forEach((edge, i) => {
      const kind = edge.relationship_kind === "join" ? "join" : edge.relationship_kind;
      const s = EDGE_STYLES[kind] ?? defaultStyle;
      lines.push(`  linkStyle ${i} stroke:${s.stroke},stroke-width:${s.width},color:${s.color}`);
    });
  }

  return lines.join("\n");
}
