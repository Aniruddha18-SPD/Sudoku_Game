import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        butter: "rgb(var(--color-butter) / <alpha-value>)",
        peach: "rgb(var(--color-peach) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        lilac: "rgb(var(--color-lilac) / <alpha-value>)",
        coral: "rgb(var(--color-coral) / <alpha-value>)",
        cream: "rgb(var(--color-cream) / <alpha-value>)",
      }
    },
  },
  plugins: [],
};

export default config;
