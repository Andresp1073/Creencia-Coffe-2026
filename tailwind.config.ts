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
          DEFAULT: "#8B7355",
        },
        cream: {
          DEFAULT: "#F5F0E8",
          dark: "#E8E0D5",
          light: "#FAF9F7",
        },
        sage: {
          DEFAULT: "#87A96B",
          light: "#C4D4B5",
        },
        whatsapp: "#25D366",
        brand: {
          brown: "#5D4037",
          caramel: "#A67C52",
          terracotta: "#C75B39",
          amber: "#D4A574",
          gold: "#C9A962",
          warm: "#8B6914",
        },
        success: {
          DEFAULT: "#22c55e",
          light: "#dcfce7",
          dark: "#15803d",
        },
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fef3c7",
          dark: "#b45309",
        },
        danger: {
          DEFAULT: "#ef4444",
          light: "#fee2e2",
          dark: "#b91c1c",
        },
        info: {
          DEFAULT: "#3b82f6",
          light: "#dbeafe",
          dark: "#1d4ed8",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1.1" }],
        "6xl": ["3.75rem", { lineHeight: "1" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        soft: "0 4px 20px -8px rgba(62,39,35,0.15)",
        warm: "0 12px 40px -16px rgba(62,39,35,0.35)",
        elevated: "0 20px 60px -20px rgba(62,39,35,0.45)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
        "soft-sm": "0 2px 8px -2px rgba(62,39,35,0.1)",
        "warm-sm": "0 4px 16px -4px rgba(62,39,35,0.25)",
      },
      backgroundImage: {
        "gradient-warm": "linear-gradient(135deg, #3E2723 0%, #6D4C41 100%)",
        "gradient-cream": "linear-gradient(180deg, #FAF9F7 0%, #F5F0E8 100%)",
        "gradient-hero": "linear-gradient(180deg, rgba(62,39,35,0.3) 0%, rgba(62,39,35,0.7) 100%)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      animation: {
        "fade-up": "fadeUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) both",
        "fade-in": "fadeIn 0.5s ease-out both",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "spin-slow": "spin 2s linear infinite",
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
        slideIn: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
        ease: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
      zIndex: {
        dropdown: "40",
        sticky: "50",
        modal: "60",
        popover: "70",
        tooltip: "80",
        toast: "100",
      },
      aspectRatio: {
        "4/3": "4 / 3",
        "3/2": "3 / 2",
        "16/9": "16 / 9",
      },
    },
  },
  plugins: [],
};

export default config;