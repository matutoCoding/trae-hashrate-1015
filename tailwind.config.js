/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#1e1b4b',
          800: '#0f172a',
          900: '#0a1628',
          950: '#050d1a',
        },
        fire: {
          orange: '#ff6b35',
          gold: '#ffd700',
          red: '#ff4757',
          yellow: '#fffa65',
        },
        cyber: {
          cyan: '#00d4ff',
          purple: '#a55eea',
          green: '#2ed573',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.5)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.5)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.5)',
        'glow-red': '0 0 20px rgba(255, 71, 87, 0.5)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)',
        'radial-glow':
          'radial-gradient(ellipse at center, rgba(255, 107, 53, 0.1) 0%, transparent 70%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 20px rgba(255, 107, 53, 0.5)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 40px rgba(255, 107, 53, 0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'sparkle': {
          '0%, 100%': { opacity: 0, transform: 'scale(0.5)' },
          '50%': { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
