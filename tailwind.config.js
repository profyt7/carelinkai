/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors - Updated to CareLinkAI branding
        primary: {
          50: "#e8f2ff",
          100: "#c2dcff",
          200: "#9bc6ff",
          300: "#74b0ff",
          400: "#4d9aff",
          500: "#3978FC", // Main primary color (CareLinkAI Blue)
          600: "#2d60ca",
          700: "#214898",
          800: "#163066",
          900: "#0a1834",
        },
        // Secondary brand colors - CareLinkAI Purple
        secondary: {
          50: "#f3f0f9",
          100: "#dfd5ed",
          200: "#cbbae1",
          300: "#b79fd5",
          400: "#a384c9",
          500: "#7253B7", // Main secondary color (CareLinkAI Purple)
          600: "#5b4292",
          700: "#44326e",
          800: "#2d2149",
          900: "#161125",
        },
        // Dark navy for text
        dark: {
          50: "#f5f5f5",
          100: "#e0e0e0",
          200: "#bdbdbd",
          300: "#9e9e9e",
          400: "#757575",
          500: "#1A1A1A", // Main dark color (CareLinkAI Dark Navy)
          600: "#151515",
          700: "#101010",
          800: "#0a0a0a",
          900: "#050505",
        },
        // Gray colors
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#63666A", // CareLinkAI Gray
          600: "#4f5256",
          700: "#3b3e42",
          800: "#27292d",
          900: "#131519",
        },
        // Secondary brand colors - greens for positive indicators
        success: {
          50: "#e6f9f1",
          100: "#c0efd9",
          200: "#99e5c0",
          300: "#73dba8",
          400: "#4dd18f",
          500: "#26c777", // Main success color (like the green in QuickBooks)
          600: "#1fa05f",
          700: "#177847",
          800: "#0f5130",
          900: "#082918",
        },
        // Warning colors
        warning: {
          50: "#fff8e6",
          100: "#ffedb3",
          200: "#ffe180",
          300: "#ffd64d",
          400: "#ffca1a",
          500: "#e6b400", // Main warning color
          600: "#b38900",
          700: "#805f00",
          800: "#4d3900",
          900: "#1a1300",
        },
        // Error colors
        error: {
          50: "#fdebeb",
          100: "#f9c5c5",
          200: "#f59e9e",
          300: "#f17878",
          400: "#ed5252",
          500: "#e92c2c", // Main error color
          600: "#ba2323",
          700: "#8c1a1a",
          800: "#5d1111",
          900: "#2f0909",
        },
        // Neutral colors for UI
        neutral: {
          50: "#f8fafc", // Lightest background
          100: "#f1f5f9", // Light background
          200: "#e2e8f0", // Light border
          300: "#cbd5e1", // Medium border
          400: "#94a3b8", // Light text
          500: "#64748b", // Medium text
          600: "#475569", // Default text
          700: "#334155", // Dark text
          800: "#1e293b", // Sidebar background (like QuickBooks)
          900: "#0f172a", // Darkest elements
        },
      },
      fontFamily: {
        // CareLinkAI Branding: Inter for headers, Roboto for body
        sans: [
          "Roboto",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        heading: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        modal: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      spacing: {
        sidebar: "240px", // Width of the sidebar like in QuickBooks
        header: "64px", // Height of the header
        "mobile-header": "56px", // Height of mobile header
        // Safe-area insets for PWAs / notch devices
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      screens: {
        // Ultra-small phones
        xxs: "360px",
        xs: "475px", // Extra small devices
        sm: "640px", // Small devices
        md: "768px", // Medium devices
        lg: "1024px", // Large devices
        xl: "1280px", // Extra large devices
        "2xl": "1536px", // 2X Extra large devices
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-in-out",
        "slide-down": "slideDown 0.3s ease-in-out",
        "fade-out": "fadeOut 0.2s ease-in",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      zIndex: {
        sidebar: "40",
        header: "30",
        modal: "50",
        dropdown: "20",
        tooltip: "60",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
    // Custom utilities for mobile / PWA interactions
    ({ addUtilities }) => {
      const newUtilities = {
        // Touch action
        ".touch-action-none": { touchAction: "none" },
        ".touch-action-manipulation": { touchAction: "manipulation" },
        // User select
        ".user-select-none": { userSelect: "none" },
        ".user-select-text": { userSelect: "text" },
      };
      addUtilities(newUtilities, ["responsive"]);
    },
  ],
};
