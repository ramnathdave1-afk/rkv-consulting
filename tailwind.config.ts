import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
      colors: {
        black: "#080A0E",
        deep: "#0D1117",
        card: "#111620",
        border: "#1E2530",
        gold: "#C9A84C",
        "gold-light": "#E8C97A",
        white: "#F0EDE8",
        muted: "#6B7280",
        green: "#22C55E",
        red: "#EF4444",
        text: "#BFC8D6",
      },
      boxShadow: {
        glow: "0 0 20px rgba(201, 168, 76, 0.15)",
        "glow-lg": "0 0 40px rgba(201, 168, 76, 0.2)",
        "glow-sm": "0 0 10px rgba(201, 168, 76, 0.1)",
        card: "0 4px 24px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.4)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201, 168, 76, 0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(201, 168, 76, 0.3)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        slideUp: {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
      },
      animation: {
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "count-up": "count-up 0.6s ease-out forwards",
        "slide-in": "slide-in 0.5s ease-out forwards",
        "fade-up": "fade-up 0.4s ease-out forwards",
        slideDown: "slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        slideUp: "slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
