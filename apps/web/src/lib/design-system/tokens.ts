export const designTokens = {
  colors: {
    // Brand colors are deliberately supplied by the active market/brand layer.
    // Keep reusable UI neutral until that decision is made.
    accent: "var(--brand-accent)",
    accentSoft: "color-mix(in srgb, var(--brand-accent) 10%, transparent)",
    accentStrong: "var(--brand-accent-strong, var(--brand-accent))",
    primary: "var(--brand-accent)",
    secondary: "var(--brand-accent-strong, var(--brand-accent))",
    // Semantic colors resolve through the theme layer so components do not
    // need to change when an alternate theme is selected.
    bg: "var(--oto-bg)",
    background: "var(--oto-bg)",
    surface: "var(--oto-surface)",
    surfaceRaised: "var(--oto-surface-raised)",
    surfaceMuted: "var(--oto-surface-muted)",
    text: "var(--oto-text)",
    textSoft: "var(--oto-text-soft)",
    muted: "var(--oto-muted)",
    border: "var(--oto-border)",
    borderStrong: "var(--oto-border-strong)",
    // Deprecated aliases remain temporarily for existing screens; new UI must
    // use accent/neutral/status tokens instead of introducing another palette.
    blue: "var(--brand-accent)",
    cyan: "var(--brand-accent-strong, var(--brand-accent))",
    orange: "var(--brand-accent)",
    success: "var(--oto-success)",
    warning: "var(--oto-warning)",
    danger: "var(--oto-danger)",
    info: "var(--oto-info)",
    skeleton: "var(--oto-skeleton)",
    hover: "var(--oto-hover)",
    disabled: "var(--oto-disabled)",
    focus: "var(--oto-focus-color)"
  },
  typography: {
    fontFamily: {
      sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
    },
    fontSize: {
      h1: ["2.5rem", { lineHeight: "1.05", fontWeight: "900" }],
      h2: ["1.875rem", { lineHeight: "1.15", fontWeight: "800" }],
      h3: ["1.25rem", { lineHeight: "1.25", fontWeight: "800" }],
      title: ["1rem", { lineHeight: "1.35", fontWeight: "800" }],
      subtitle: ["0.9375rem", { lineHeight: "1.6", fontWeight: "600" }],
      body: ["1rem", { lineHeight: "1.65", fontWeight: "500" }],
      caption: ["0.75rem", { lineHeight: "1.45", fontWeight: "600" }],
      badge: ["0.75rem", { lineHeight: "1", fontWeight: "800" }],
      button: ["0.875rem", { lineHeight: "1", fontWeight: "800" }],
      label: ["0.75rem", { lineHeight: "1.35", fontWeight: "800" }],
      helper: ["0.875rem", { lineHeight: "1.5", fontWeight: "600" }],
      error: ["0.875rem", { lineHeight: "1.5", fontWeight: "700" }]
    }
  },
  spacing: {
    "0": "0",
    "0.5": "0.125rem",
    "1": "0.25rem",
    "1.5": "0.375rem",
    "2": "0.5rem",
    "2.5": "0.625rem",
    "3": "0.75rem",
    "3.5": "0.875rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem",
    "20": "5rem",
    "24": "6rem"
  },
  radius: {
    none: "0",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    card: "8px",
    modal: "12px",
    avatar: "999px",
    button: "6px",
    oto: "8px"
  },
  borderWidth: {
    hairline: "1px",
    strong: "2px"
  },
  shadow: {
    oto: "0 16px 40px rgba(17, 17, 17, 0.08)",
    soft: "0 8px 24px rgba(17, 17, 17, 0.06)",
    card: "0 10px 28px rgba(15, 23, 42, 0.08)",
    modal: "0 24px 70px rgba(15, 23, 42, 0.18)",
    focus: "0 0 0 3px rgba(37, 99, 235, 0.16)"
  },
  opacity: {
    disabled: "0.5",
    overlay: "0.58",
    muted: "0.72"
  },
  transition: {
    fast: "120ms",
    base: "180ms",
    slow: "240ms"
  },
  zIndex: {
    header: "30",
    mobileNav: "40",
    overlay: "50",
    drawer: "60",
    modal: "70",
    toast: "80"
  },
  container: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1180px",
    "2xl": "1320px"
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px"
  }
} as const;

export type DesignTokens = typeof designTokens;

/** Brand configuration supplies the accent at the product boundary. */
export type BrandColorConfig = {
  accent: string;
  accentStrong?: string;
};
