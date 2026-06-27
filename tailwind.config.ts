import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        leaf: "#0f766e",
        moss: "#e6f4f1",
        cream: "#f8fafc",
        sand: "#d8dee6",
        clay: "#b45309"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.10)",
        card: "0 16px 44px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
