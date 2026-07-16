import type { Config } from "tailwindcss";
import { designTokens } from "./src/lib/design-system/tokens";

type ThemeExtend = NonNullable<NonNullable<Config["theme"]>["extend"]>;

const fontSize = Object.fromEntries(
  Object.entries(designTokens.typography.fontSize).map(([key, value]) => [key, [value[0], { ...value[1] }]])
) as ThemeExtend["fontSize"];

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: designTokens.breakpoints,
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        md: "1.5rem",
        lg: "2rem"
      },
      screens: {
        xl: designTokens.container.xl,
        "2xl": designTokens.container["2xl"]
      }
    },
    extend: {
      colors: {
        oto: designTokens.colors
      },
      fontFamily: {
        sans: [...designTokens.typography.fontFamily.sans]
      },
      fontSize,
      spacing: designTokens.spacing,
      borderRadius: designTokens.radius,
      borderWidth: designTokens.borderWidth,
      boxShadow: designTokens.shadow,
      opacity: designTokens.opacity,
      transitionDuration: designTokens.transition,
      zIndex: designTokens.zIndex,
      keyframes: {
        "oto-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "oto-slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "oto-drawer-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" }
        }
      },
      animation: {
        "oto-fade-in": "oto-fade-in 180ms ease-out",
        "oto-slide-up": "oto-slide-up 180ms ease-out",
        "oto-drawer-in": "oto-drawer-in 220ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
