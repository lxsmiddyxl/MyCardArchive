import type { Config } from "tailwindcss";
import { mcaTailwindExtend } from "./src/styles/tokens";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/mca-ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/styles/**/*.{css,scss}",
    "./storybook/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        "mca-display": ["2.25rem", { lineHeight: "1.15", fontWeight: "600" }],
        "mca-h1": ["1.5rem", { lineHeight: "1.25", fontWeight: "600" }],
        "mca-h2": ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        "mca-h3": ["1.125rem", { lineHeight: "1.35", fontWeight: "600" }],
        "mca-body": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "mca-label": ["0.75rem", { lineHeight: "1.4", fontWeight: "600" }],
        "mca-caption": ["0.6875rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      transitionTimingFunction: {
        "mca-standard": "cubic-bezier(0.16, 1, 0.3, 1)",
        "mca-binder": "cubic-bezier(0.33, 1, 0.68, 1)",
      },
      ...mcaTailwindExtend,
    },
  },
  plugins: [],
};

export default config;
