export const THEME_COLORS = [
  { name: "Preto", color: "#171717" },
  { name: "Azul", color: "#2563eb" },
  { name: "Vermelho", color: "#dc2626" },
  { name: "Verde", color: "#16a34a" },
  { name: "Rosa", color: "#ec4899" },
  { name: "Roxo", color: "#7c3aed" },
  { name: "Amarelo", color: "#f59e0b" },
  { name: "Laranja", color: "#ea580c" },
  { name: "Teal", color: "#0d9488" },
  { name: "Ciano", color: "#0891b2" },
];

const DEFAULT_COLOR = "#171717";

function normalize(hex: string): string {
  const value = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(value)) return `#${value}`;
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value
      .split("")
      .map((c) => c + c)
      .join("")}`;
  }
  return DEFAULT_COLOR;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) =>
    parseInt(value.slice(i, i + 2), 16) / 255,
  );
  const linear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function themeVars(color: string): React.CSSProperties {
  const hex = normalize(color);
  const foreground = luminance(hex) > 0.45 ? "#1c1917" : "#ffffff";
  return {
    "--primary": hex,
    "--primary-foreground": foreground,
    "--ring": hex,
  } as React.CSSProperties;
}
