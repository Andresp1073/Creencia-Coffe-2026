import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          dark: "#3E2723",
          medium: "#6D4C41",
          light: "#8B7355",
        },
        cream: {
          DEFAULT: "#F5F0E8",
          dark: "#E8E0D5",
        },
        sage: {
          DEFAULT: "#87A96B",
          light: "#C4D4B5",
        },
        whatsapp: "#25D366",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px -8px rgba(62,39,35,0.15)",
        warm: "0 12px 40px -16px rgba(62,39,35,0.35)",
        elevated: "0 20px 60px -20px rgba(62,39,35,0.45)",
      },
      backgroundImage: {
        "gradient-warm": "linear-gradient(135deg, #3E2723 0%, #6D4C41 100%)",
        "gradient-cream": "linear-gradient(180deg, #FAF9F7 0%, #F5F0E8 100%)",
        "gradient-hero": "linear-gradient(180deg, rgba(62,39,35,0.3) 0%, rgba(62,39,35,0.7) 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) both",
        "fade-in": "fadeIn 0.5s ease-out both",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;