/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Core backgrounds ──────────────────────
        void:    "#020b18",
        abyss:   "#060f1e",
        surface: "#0d1f36",
        frame:   "#1a3557",
        // ── Legacy aliases (keep existing code working) ──
        ink:     "#020b18",
        panel:   "#060f1e",
        line:    "#1a3557",
        // ── Accents ───────────────────────────────
        signal:  "#00d4ff",
        volt:    "#a855f7",
        cyanline:"#00d4ff",
        // ── Semantic ──────────────────────────────
        good:    "#22c55e",
        warn:    "#f59e0b",
        warning: "#f59e0b",
        danger:  "#ef4444",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans:    ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "'Cascadia Code'", "Consolas", "monospace"],
      },
      boxShadow: {
        "glow-sm":   "0 0 15px rgba(0,212,255,0.15)",
        "glow":      "0 0 30px rgba(0,212,255,0.25), 0 0 60px rgba(0,212,255,0.08)",
        "glow-lg":   "0 0 50px rgba(0,212,255,0.3), 0 0 100px rgba(0,212,255,0.1)",
        "glow-volt": "0 0 30px rgba(168,85,247,0.25)",
        "card":      "0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      animation: {
        "scan":       "scan 5s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        "ping-dot":   "pingDot 1.4s ease-in-out infinite",
        "fade-up":    "fadeUp 0.4s ease-out forwards",
        "slide-in":   "slideIn 0.35s ease-out forwards",
      },
      keyframes: {
        scan: {
          "0%":   { transform: "translateY(-160px)", opacity: "0" },
          "8%":   { opacity: "1" },
          "92%":  { opacity: "1" },
          "100%": { transform: "translateY(110vh)",  opacity: "0" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 20px rgba(0,212,255,0.2)" },
          "50%":     { boxShadow: "0 0 45px rgba(0,212,255,0.55), 0 0 80px rgba(0,212,255,0.15)" },
        },
        pingDot: {
          "0%,100%": { transform: "scale(1)",   opacity: "1" },
          "50%":     { transform: "scale(1.8)", opacity: "0.35" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};