/** @type {import('tailwindcss').Config} */

// NOTE: react-scripts 5 enables Tailwind purely by detecting THIS file at the
// project root (see webpack.config.js `useTailwind`). It sets PostCSS
// `config: false`, so a postcss.config.js in this project would be ignored —
// do not add one expecting it to work.
//
// Colours are CSS variables declared in src/app.css (light on :root, dark under
// prefers-color-scheme). Each variable holds RGB channels ("21 24 29") so the
// Tailwind opacity modifier still works: `bg-primary/10`.
//
// Semantic verdict colours (success / destructive / warning) are separate from
// the neutral primary so green and red only ever mean one thing.

const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        background: rgb('background'),
        foreground: rgb('foreground'),
        card: rgb('card'),
        muted: { DEFAULT: rgb('muted'), foreground: rgb('muted-foreground') },
        border: rgb('border'),
        primary: { DEFAULT: rgb('primary'), foreground: rgb('primary-foreground') },
        success: { DEFAULT: rgb('success'), foreground: rgb('success-foreground') },
        destructive: { DEFAULT: rgb('destructive'), foreground: rgb('destructive-foreground') },
        warning: { DEFAULT: rgb('warning'), foreground: rgb('warning-foreground') },
        ring: rgb('ring'),
      },
      fontFamily: {
        // System stack: SF Pro on iOS, Roboto on Android, Segoe on Windows.
        // No webfont request, so first paint is immediate and offline works.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        float: '0 12px 32px -12px rgb(21 24 29 / 0.25)',
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
