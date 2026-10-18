export const colours = [
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
];

export const more_colours = [
  "#111827",
  "#475569",
  "#64748b",
  "#94a3b8",
  "#b91c1c",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#9f1239",
  "#78350f",
];

export const all_colours = [...colours, ...more_colours];

export function randomColour() {
  return all_colours[Math.floor(Math.random() * all_colours.length)];
}
