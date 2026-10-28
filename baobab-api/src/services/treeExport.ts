import type { FamilyTreeResult } from "./familyTree";

const GROUP_COLORS: Record<string, string> = {
  self: "#C45B1C",
  ancestor: "#5B4B8A",
  descendant: "#2E7D6B",
  spouse: "#B8860B",
  collateral: "#4A7BA7"
};

export function familyTreeToSvg(tree: FamilyTreeResult): string {
  const width = 960;
  const height = 640;
  const padding = 48;
  const rowHeight = 110;

  const byGeneration = new Map<number, typeof tree.nodes>();
  for (const node of tree.nodes) {
    const list = byGeneration.get(node.generation) ?? [];
    list.push(node);
    byGeneration.set(node.generation, list);
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b);
  const minGen = generations[0] ?? 0;

  const positions = new Map<string, { x: number; y: number }>();

  for (const gen of generations) {
    const row = byGeneration.get(gen) ?? [];
    const y = padding + (gen - minGen) * rowHeight;
    const rowWidth = width - padding * 2;
    row.forEach((node, index) => {
      const x =
        row.length === 1
          ? width / 2
          : padding + (rowWidth * index) / Math.max(row.length - 1, 1);
      positions.set(node.id as string, { x, y });
    });
  }

  const nodeRects = tree.nodes
    .map((node) => {
      const pos = positions.get(node.id as string);
      if (!pos) return "";
      const color = GROUP_COLORS[node.ui.group] ?? "#666";
      const label = node.ui.label;
      const role = node.roles.join(", ");
      return `
        <g>
          <rect x="${pos.x - 70}" y="${pos.y - 28}" width="140" height="56" rx="10" fill="${color}" opacity="0.92"/>
          <text x="${pos.x}" y="${pos.y - 4}" text-anchor="middle" fill="white" font-size="13" font-family="Segoe UI, sans-serif" font-weight="600">${escapeXml(label)}</text>
          <text x="${pos.x}" y="${pos.y + 14}" text-anchor="middle" fill="white" font-size="10" font-family="Segoe UI, sans-serif" opacity="0.9">${escapeXml(role)}</text>
        </g>`;
    })
    .join("");

  const edgeLines = tree.edges
    .map((edge) => {
      const from = positions.get(edge.fromPersonId);
      const to = positions.get(edge.toPersonId);
      if (!from || !to) return "";
      return `<line x1="${from.x}" y1="${from.y + 28}" x2="${to.x}" y2="${to.y - 28}" stroke="#8B7355" stroke-width="1.5" marker-end="url(#arrow)"/>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.max(height, padding * 2 + generations.length * rowHeight)}" viewBox="0 0 ${width} ${Math.max(height, padding * 2 + generations.length * rowHeight)}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#8B7355"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#FBF7F0"/>
  <text x="${width / 2}" y="28" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="18" fill="#3D2914" font-weight="700">Baobab — Arbre familial</text>
  ${edgeLines}
  ${nodeRects}
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function familyTreeToPrintableHtml(tree: FamilyTreeResult): string {
  const rows = tree.nodes
    .sort((a, b) => a.generation - b.generation)
    .map(
      (n) =>
        `<tr><td>${escapeXml(n.ui.label)}</td><td>${n.generation}</td><td>${escapeXml(n.roles.join(", "))}</td><td>${escapeXml(n.ui.group)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Baobab — Arbre familial</title>
  <style>
    body { font-family: Segoe UI, sans-serif; background: #FBF7F0; color: #3D2914; padding: 32px; }
    h1 { color: #C45B1C; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #E0D2C0; padding: 10px; text-align: left; }
    th { background: #F3E8D8; }
  </style>
</head>
<body>
  <h1>Baobab — Arbre familial</h1>
  <p>Racine : <strong>${escapeXml(tree.root.ui.label)}</strong></p>
  <table>
    <thead><tr><th>Personne</th><th>Génération</th><th>Rôles</th><th>Groupe</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
