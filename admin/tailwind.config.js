/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // GreanBarter green-forward palette, tuned for an admin surface.
        primary: {
          DEFAULT: "#1f8f4e",
          50: "#eafaf0",
          100: "#d0f2dd",
          200: "#a3e5bd",
          300: "#6fd296",
          400: "#3fb673",
          500: "#1f8f4e",
          600: "#177540",
          700: "#135d34",
          800: "#11492b",
          900: "#0d3a23",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f6f8f7",
          border: "#e4e9e6",
        },
        ink: {
          DEFAULT: "#16201b",
          soft: "#4d5a52",
          faint: "#8a978f",
        },
        danger: "#dc2626",
        warning: "#d97706",
        info: "#2563eb",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Manrope", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        panel: "0 4px 24px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
};
