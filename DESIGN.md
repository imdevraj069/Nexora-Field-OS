---
version: "1.0.0"
tokens:
  colors:
    canvas:
      base: "#080a0f"
      subtle: "#0e121a"
      elevated: "#131924"
    content:
      primary: "#f1f5f9"
      secondary: "#94a3b8"
      muted: "#64748b"
    brand:
      primary: "#10b981"
      primaryHover: "#059669"
      amber: "#f59e0b"
      cyan: "#06b6d4"
    status:
      success: "#10b981"
      warning: "#f59e0b"
      danger: "#ef4444"
      info: "#06b6d4"
    border:
      hairline: "rgba(255, 255, 255, 0.08)"
      active: "rgba(16, 185, 129, 0.45)"
  typography:
    fonts:
      display: "Space Grotesk, sans-serif"
      body: "Inter, sans-serif"
      mono: "JetBrains Mono, monospace"
  radii:
    sm: "6px"
    md: "10px"
    lg: "16px"
    full: "9999px"
---

# Nexora Field OS — Design System Contract

## 1. Aesthetic Direction: Obsidian Tactical + Industrial Precision
- **No AI-Slop:** Strictly forbid violet/purple radial glows, nested card-inside-card clutter, or washed-out low-contrast text.
- **Two Surface Modes:**
  - **Persuade (`/`):** Spatial clarity, crisp hairline surfaces, bespoke vector brand mark & shard-topology diagram, smooth tactile motion.
  - **Operate (`/dashboard`, `/roles`, `/projects`, `/ai-planner`):** Compact 8px/16px modular grid, `tabular-nums` alignment on Org IDs (`SOL-26-AX65T`), Shard tags (`S1`/`S2`/`S3`), efficiency percentages, and deadlines.

## 2. Motion & Accessibility Rules
- Interactive transitions stay under `250ms` with spring physics (`stiffness: 380, damping: 30`).
- Honor `prefers-reduced-motion: reduce`.
- Maintain WCAG AA contrast (`>= 4.5:1` for body text) and distinct `:focus-visible` emerald rings on all interactive controls.
