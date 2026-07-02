import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        oto: {
          bg: "#FFFFFF",
          surface: "#F7F8FA",
          text: "#111111",
          muted: "#6B7280",
          blue: "#2563EB",
          cyan: "#22D3EE",
          orange: "#F59E0B",
          success: "#16A34A",
          danger: "#DC2626",
          border: "#E5E7EB"
        }
      },
      boxShadow: {
        oto: "0 16px 40px rgba(17, 17, 17, 0.08)",
        soft: "0 8px 24px rgba(17, 17, 17, 0.06)"
      },
      borderRadius: {
        oto: "8px"
      }
    }
  },
  plugins: []
};

export default config;
