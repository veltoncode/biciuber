import React from "react";

export default function BicitaxiIcon({
  size = 120,
  className = "",
  title = "Bicitáxi de Afuá",
  color = "#ffffff",
  variant,
  decorative = false,
}) {
  const isDark =
    variant === "dark" ||
    color === "currentColor" ||
    color === "#000000" ||
    color === "#000" ||
    color === "#080808";

  const imgSrc = isDark
    ? "/icons/bicitaxi-afua-dark.png"
    : "/icons/bicitaxi-afua.png";

  return (
    <img
      src={imgSrc}
      width={size}
      height={size}
      className={className}
      alt={decorative ? "" : title}
      aria-hidden={decorative ? "true" : undefined}
      draggable="false"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        userSelect: "none",
        background: "transparent",
      }}
    />
  );
}