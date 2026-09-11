/**
 * JS-side mirror of the design tokens in global.css's @theme block, for the
 * handful of native props that take a raw color/value instead of a
 * className (Switch trackColor, Ionicons color, shadowColor, etc).
 */

export const Colors = {
  canvas: "#05060f",
  steel: "#2f343e",
  fog: "#9da7ba",
  mist: "#c7d3ea",
  frost: "#d1e4fa",
  ice: "#d8ecf8",
  violet: "#663af3",
  glassEdge: "rgba(186, 215, 247, 0.12)",
  luminousFill: "rgba(199, 211, 234, 0.12)",
  modalSurface: "rgba(5, 6, 15, 0.97)",
};

export const Radius = {
  card: 16,
  badge: 6,
  input: 6,
  button: 999,
  icon: 9999,
};
