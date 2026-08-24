/** @type {import('tailwindcss').Config} */

// NOTE: react-scripts 5 enables Tailwind purely by detecting THIS file at the
// project root (see webpack.config.js `useTailwind`). It sets PostCSS
// `config: false`, so a postcss.config.js in this project would be ignored —
// do not add one expecting it to work.
//
// Palette: "Kerbside". Derived from NSW parking signage — asphalt darks with a
// green bias, one brand accent (road-marking yellow) used for wayfinding and
// action only. Green and red are reserved as semantic verdict colours so they
// mean exactly one thing: you may park, or you may not.
//
// Everything here EXTENDS the stock Tailwind theme rather than replacing it,
// so existing utility classes (bg-gray-900, text-white, …) keep working.

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        // Surfaces, darkest to lightest
        ground: '#0E1210',
        raised: '#141916',
        panel: '#181D19',
        rule: '#262D27',

        // Type
        ink: '#EDEFE8',
        dim: '#8B9488',
        faint: '#79826F',

        // Brand accent — wayfinding and primary action only
        signal: {
          DEFAULT: '#E4B33C',
          ink: '#14180F', // text placed on a signal field
        },

        // Semantic verdict colours — never decorative
        permit: {
          DEFAULT: '#43B87C',
          ink: '#08130D',
        },
        deny: {
          DEFAULT: '#E4685A',
          ink: '#2A0C08',
        },
        caution: {
          DEFAULT: '#D9A03F',
          ink: '#231704',
        },
      },

      fontFamily: {
        // Condensed grotesque reads as road signage. Local stacks only — no
        // webfont request, so first paint is immediate and the app still
        // renders correctly offline.
        display: [
          '"Avenir Next Condensed"',
          '"HelveticaNeue-CondensedBold"',
          '"Arial Narrow"',
          '"Liberation Sans Narrow"',
          'system-ui',
          'sans-serif',
        ],
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          '"SF Mono"',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },

      fontSize: {
        // Display sizes for the verdict — tight leading, negative tracking.
        verdict: ['3.5rem', { lineHeight: '0.9', letterSpacing: '-0.02em' }],
        'verdict-sm': ['2.5rem', { lineHeight: '0.92', letterSpacing: '-0.02em' }],
        kicker: ['0.5625rem', { lineHeight: '1.2', letterSpacing: '0.17em' }],
      },

      // Shadows tinted toward the ground hue rather than pure black.
      boxShadow: {
        field: '0 10px 30px -12px rgba(8, 19, 13, 0.55)',
      },

      minHeight: {
        // iOS Safari counts the collapsing toolbar inside 100vh, so full-height
        // views jump as the bar hides. dvh tracks the visible viewport.
        screen: '100dvh',
      },
      height: {
        screen: '100dvh',
      },
    },
  },
  plugins: [],
};
