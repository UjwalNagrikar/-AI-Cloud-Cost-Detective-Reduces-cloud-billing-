/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0d1117",
        panel: "#161b22",
        line: "#30363d",
        cyanline: "#22d3ee",
        warning: "#f59e0b",
        danger: "#ef4444",
        good: "#22c55e"
      }
    }
  },
  plugins: []
};
