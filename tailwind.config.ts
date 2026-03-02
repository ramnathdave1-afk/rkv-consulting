import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        display: ["DM Serif Display", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        black: "#080808",
        deep: "#050505",
        card: "#111111",
        tertiary: "#1a1a1a",
        border: "#1e1e1e",
        "border-hover": "#333333",
        gold: "#c9a84c",
        "gold-light": "#d4b85e",
        violet: "#c9a84c",
        warning: "#D97706",
        white: "#f5f5f5",
        muted: "#888888",
        "muted-deep": "#555555",
        green: "#c9a84c",
        red: "#DC2626",
        text: "#f5f5f5",
        grid: "#1e1e1e",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "stagger-fade": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
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
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "background-gradient": {
          "0%, 100%": {
            transform: "translate(0, 0)",
            animationDelay: "var(--background-gradient-delay, 0s)",
          },
          "20%": {
            transform:
              "translate(calc(100% * var(--tx-1, 1)), calc(100% * var(--ty-1, 1)))",
          },
          "40%": {
            transform:
              "translate(calc(100% * var(--tx-2, -1)), calc(100% * var(--ty-2, 1)))",
          },
          "60%": {
            transform:
              "translate(calc(100% * var(--tx-3, 1)), calc(100% * var(--ty-3, -1)))",
          },
          "80%": {
            transform:
              "translate(calc(100% * var(--tx-4, -1)), calc(100% * var(--ty-4, -1)))",
          },
        },
      },
      animation: {
        "stagger-fade": "stagger-fade 0.4s ease-out forwards",
        "count-up": "count-up 0.6s ease-out forwards",
        "slide-in": "slide-in 0.5s ease-out forwards",
        "fade-up": "fade-up 0.4s ease-out forwards",
        slideDown: "slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        slideUp: "slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        "slide-in-right": "slide-in-right 0.3s ease-out forwards",
        "fade-in": "fade-in 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        "background-gradient":
          "background-gradient var(--background-gradient-speed, 15s) cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
