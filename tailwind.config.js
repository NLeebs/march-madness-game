const autoprefixer = require('autoprefixer');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      width: {
        "teamBar": '300px',
      },
      minWidth: {
        '50' : '50px', 
        '250': '250px',
        '350': '350px',
      },
      maxWidth: {
        '275': '275px',
        '300': '300px',
        "tourny": "2325px"
      },
      padding: {
        "104": "26rem",
        "112": "28rem",
        "135": "33.75rem",
        "252": "63rem",
        "280": "75rem",
      },
      gap: {
        '42': "10.5rem",
        '84': "21rem",
        '100': '25rem',
        '122': '30.5rem',
      },
      inset: {
        "120": "30rem",
        "156": "38rem",
      },
      keyframes: {
        fadeOut: {
          '0%': {
            visibility: "visibile",
          },
          '100%': {
            visibility: "hidden",
          },
        },
        startTheGameBasketball: {
          '0%': { 
            tranform: 'translateY(0)', 
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '15%, 45%': { 
            transform: 'translateY(15%)', 
            animationTimingGunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
          '30%, 60%': { 
            transform: 'translateY(-15%)', 
            animationTimingGunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
          '100%': { transform: 'translateY(-1000px) rotate(1turn)', },
        },
      },
      animation: {
        fadeOut: 'fadeOut 1s ease-out forwards',
        startTheGameBasketball: 'startTheGameBasketball 1s forwards'
      }
    },
  },
  plugins: [],
}
