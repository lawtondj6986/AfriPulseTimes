import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        // RGB-channel CSS variables so Tailwind opacity modifiers
        // (e.g. bg-navy/80, border-gold/40) work as expected.
        navy: {
          DEFAULT: "rgb(var(--navy-rgb, 15 23 42) / <alpha-value>)", // #0F172A
          deep: "rgb(var(--navy-deep-rgb, 10 37 64) / <alpha-value>)", // #0A2540
          light: "rgb(var(--navy-light-rgb, 21 44 74) / <alpha-value>)", // #152C4A
        },
        gold: {
          DEFAULT: "rgb(var(--gold-rgb, 197 164 110) / <alpha-value>)", // #C5A46E
          dark: "rgb(var(--gold-dark-rgb, 184 134 11) / <alpha-value>)", // #B8860B
          light: "rgb(var(--gold-light-rgb, 217 190 142) / <alpha-value>)", // #D9BE8E
        },
        charcoal: "rgb(var(--charcoal-rgb, 30 41 59) / <alpha-value>)", // #1E293B
        cream: "rgb(var(--cream-rgb, 248 245 239) / <alpha-value>)", // #F8F5EF
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
