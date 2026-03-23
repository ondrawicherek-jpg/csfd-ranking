import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0a0a",
          secondary: "#141414",
          card: "#1a1a1a",
          hover: "#222222",
        },
        accent: {
          DEFAULT: "#e63946",
          hover: "#c1121f",
        },
        text: {
          primary: "#f5f5f5",
          secondary: "#a0a0a0",
          muted: "#666666",
        },
        border: "#2a2a2a",
        seen: "#22c55e",
        unseen: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
