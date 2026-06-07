import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        cloud: "#f8fafc",
        skyglass: "#dff5ff",
        mint: "#d6f7e8",
        coral: "#ff6f61"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(17, 24, 39, 0.12)"
      }
    },
  },
  plugins: [],
};

export default config;
