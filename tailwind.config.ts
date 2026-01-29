import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f6fb",
          100: "#e6ebf7",
          200: "#c7d3ef",
          300: "#9fb0e3",
          400: "#6f85d2",
          500: "#4a61c2",
          600: "#364aa7",
          700: "#2a3a82",
          800: "#223266",
          900: "#1f2d56"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
