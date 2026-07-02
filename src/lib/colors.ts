export function getProjectColor(id: string) {
  if (!id) return "#94a3b8"; // default subtle gray
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"];
  const index = id.charCodeAt(id.length - 1) % colors.length;
  return colors[index];
}

export function getUserColor(identifier: string) {
  if (!identifier) return "#334155"; // default slate
  // A set of sophisticated, slightly muted colors for avatars
  const colors = [
    "#dc2626", // red
    "#ea580c", // orange
    "#ca8a04", // yellow
    "#16a34a", // green
    "#059669", // emerald
    "#0891b2", // cyan
    "#2563eb", // blue
    "#4f46e5", // indigo
    "#7c3aed", // violet
    "#c026d3", // fuchsia
    "#db2777", // pink
    "#e11d48", // rose
  ];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
