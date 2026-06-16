/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'editor-bg': '#0f172a',
        'editor-panel': '#1e293b',
        'editor-border': '#334155',
        'editor-accent': '#22d3ee',
        'editor-keyframe': '#a855f7',
        'editor-warn': '#f59e0b',
        'editor-success': '#10b981',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 12px rgba(34, 211, 238, 0.4)',
        'glow-purple': '0 0 12px rgba(168, 85, 247, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
