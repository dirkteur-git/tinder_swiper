import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a1320",
          900: "#0f1c2e",
          800: "#162640",
          700: "#1e3354"
        },
        steel: {
          100: "#dde6f0",
          200: "#b9cadd",
          300: "#8faac5",
          400: "#647ea0"
        },
        accent: {
          yes: "#22c55e",
          no: "#ef4444",
          maybe: "#3b82f6"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 8px 16px -8px rgba(0, 0, 0, 0.3)"
      }
    }
  },
  plugins: []
};

export default config;
