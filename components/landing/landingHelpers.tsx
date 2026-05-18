import { useEffect, useState } from "react";

export function FontLoader() {
  useEffect(() => undefined, []);
  return null;
}

export function NoiseOverlay() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
    }} />
  );
}

export function HoverCard({ children, baseStyle, hoverStyle }: {
  children: React.ReactNode;
  baseStyle: React.CSSProperties;
  hoverStyle: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...baseStyle, ...(hovered ? hoverStyle : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}
