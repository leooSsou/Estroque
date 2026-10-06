/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Source Code Pro"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        estroque: {
          canvas: '#000000',
          card: '#141518',
          elevated: '#1D1E22',
          modal: '#18191D',
          border: 'rgba(255, 255, 255, 0.08)',
          vibrant: '#00E599',
          neonGreen: '#00E599',
          neonAmber: '#FF9F43',
          emerald: '#0B2B26',
          pine: '#163832',
          forest: '#235347',
          sage: '#8A8F98',
          mint: '#E5E7EB',
          text: {
            primary: '#FFFFFF',
            secondary: '#8A8F98',
            muted: '#62666D',
          }
        }
      },
      borderRadius: {
        'bento': '20px',
        'card': '24px',
      },
      boxShadow: {
        'bento-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.07)',
        'glow-emerald': '0 0 25px -5px rgba(0, 229, 153, 0.35)',
        'glow-emerald-lg': '0 0 35px -5px rgba(0, 229, 153, 0.5)',
        'glow-neon-green': '0 0 20px -2px rgba(0, 229, 153, 0.45)',
        'glow-neon-amber': '0 0 20px -2px rgba(255, 159, 67, 0.45)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.15)' },
        },
        growWidth: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-down': 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'grow-width': 'growWidth 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
