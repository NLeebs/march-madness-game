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
      minWidth: {
        '250': '250px',
        '300': '300px',
      },
      maxWidth: {
        "tourny": "2100px"
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
    },
  },
  plugins: [],
}
