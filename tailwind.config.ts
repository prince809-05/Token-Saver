import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        leaf: "#2f6f4e",
        moss: "#eef6e8",
        cream: "#fbf7ee",
        sand: "#eadfc8",
        clay: "#b96f4a"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(39, 63, 47, 0.12)",
        card: "0 18px 50px rgba(47, 111, 78, 0.10)"
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
