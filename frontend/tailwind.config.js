/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        estroque: {
          canvas: '#070E0D',
          card: '#0D1917',
          elevated: '#142522',
          modal: '#1B332E',
          border: 'rgba(142, 182, 155, 0.12)',
          vibrant: '#10B981',
          emerald: '#0B2B26',
          pine: '#163832',
          forest: '#235347',
          sage: '#8EB69B',
          mint: '#DAF1DE',
          text: {
            primary: '#F3FBF6',
            secondary: '#94A89E',
            muted: '#5E756B',
          }
        }
      },
      borderRadius: {
        'bento': '20px',
        'card': '24px',
      },
      boxShadow: {
        'bento-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(142, 182, 155, 0.12)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
