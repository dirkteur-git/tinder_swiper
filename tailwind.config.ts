import type { Config } from "tailwindcss";

/**
 * Tokens uit vondr-brand-as-code v2026.Q2 — 05-visueel/tokens.json.
 * Brand-tokens onder `vondr.*`. Semantische aliases (bg/surface/ink/line/accent)
 * mappen naar brand-tokens zodat bestaande components blijven werken.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // — vondr brand-tokens (canoniek) —
        vondr: {
          white: "#F2F5F2",
          "dark-blue": "#13102D",
          "light-blue": "#B3C6D4",
          pop: "#FF4F00"
        },
        "dark-section": "#0a1628",

        // — semantische aliases —
        // bg = de page-achtergrond (wit, zoals het phone-interior in de mockup).
        // surface = subtiel grijs voor secundaire vlakken (chips, mini-tegels, edit-zones)
        // zodat cards op witte page nog contrast hebben via border, niet via bg-verschil.
        bg: {
          DEFAULT: "#FFFFFF", // page = wit
          soft: "#F7F9F7"     // alternatief: licht-grijs voor sub-blokken
        },
        surface: {
          DEFAULT: "#FFFFFF", // cards blijven wit + border voor scheiding
          soft: "#F7F9F7"     // chips, mini-vakken, edit-velden
        },
        ink: {
          900: "#13102D", // vondr.dark-blue
          800: "#1f2937",
          700: "#374151",
          600: "#4b5563",
          500: "#6b7280",
          400: "#9ca3af",
          300: "#d1d5db"
        },
        line: {
          DEFAULT: "#e5e7eb", // gray-200
          strong: "#d1d5db" // gray-300
        },
        accent: {
          yes: "#16a34a",
          no: "#dc2626",
          maybe: "#2563eb",
          pop: "#FF4F00" // = vondr.pop, voor primaire CTA
        }
      },
      fontFamily: {
        sans: [
          "Newgrotesk",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ]
      },
      spacing: {
        "vondr-xs": "4px",
        "vondr-s": "8px",
        "vondr-m": "16px",
        "vondr-l": "24px",
        "vondr-xl": "40px",
        "vondr-xxl": "64px"
      },
      borderRadius: {
        "vondr-s": "4px",
        "vondr-m": "8px",
        "vondr-l": "16px",
        "vondr-xl": "24px"
      },
      boxShadow: {
        card:
          "0 24px 48px -16px rgba(19, 16, 45, 0.18), 0 8px 16px -8px rgba(19, 16, 45, 0.08)",
        tile:
          "0 1px 2px rgba(19, 16, 45, 0.04), 0 4px 12px -4px rgba(19, 16, 45, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
