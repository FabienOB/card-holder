/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // System stacks only: nothing is fetched at runtime.
        sans: ['system-ui', '-apple-system', 'Roboto', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'Roboto Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
