import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#f5f5f0",
          soft: "#ffffff"
        },
        surface: {
          DEFAULT: "#ffffff",
          soft: "#fafaf6"
        },
        ink: {
          900: "#0a1320",
          800: "#0f1c2e",
          700: "#1e3354",
          500: "#4a5a72",
          400: "#7989a0",
          300: "#a8b3c4"
        },
        line: {
          DEFAULT: "#e5e5dc",
          strong: "#c8c8b8"
        },
        accent: {
          yes: "#16a34a",
          no: "#dc2626",
          maybe: "#2563eb"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card:
          "0 24px 48px -16px rgba(15, 28, 46, 0.18), 0 8px 16px -8px rgba(15, 28, 46, 0.08)",
        tile: "0 1px 2px rgba(15, 28, 46, 0.04), 0 4px 12px -4px rgba(15, 28, 46, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
