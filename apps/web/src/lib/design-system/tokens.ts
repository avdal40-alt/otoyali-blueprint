export const designTokens = {
  colors: {
    primary: "#2563EB",
    secondary: "#22D3EE",
    bg: "#FFFFFF",
    background: "#FFFFFF",
    surface: "#F7F8FA",
    surfaceRaised: "#FFFFFF",
    surfaceMuted: "#F1F5F9",
    text: "#111111",
    textSoft: "#374151",
    muted: "#6B7280",
    border: "#E5E7EB",
    borderStrong: "#CBD5E1",
    blue: "#2563EB",
    cyan: "#22D3EE",
    orange: "#F59E0B",
    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#DC2626",
    info: "#0EA5E9",
    skeleton: "#EEF2F7",
    hover: "#F3F6FA",
    disabled: "#E5E7EB",
    focus: "#93C5FD",
    darkBg: "#0B1220",
    darkSurface: "#111827",
    darkText: "#F9FAFB",
    darkMuted: "#94A3B8",
    darkBorder: "#1F2937"
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
      body: ["0.875rem", { lineHeight: "1.65", fontWeight: "500" }],
      caption: ["0.75rem", { lineHeight: "1.45", fontWeight: "600" }],
      badge: ["0.75rem", { lineHeight: "1", fontWeight: "800" }],
      button: ["0.875rem", { lineHeight: "1", fontWeight: "800" }],
      label: ["0.75rem", { lineHeight: "1.35", fontWeight: "800" }],
      helper: ["0.75rem", { lineHeight: "1.5", fontWeight: "600" }],
      error: ["0.8125rem", { lineHeight: "1.5", fontWeight: "700" }]
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
