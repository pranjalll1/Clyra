/** Tokens come from the Stitch "Clyra Editorial" DESIGN.md and code.html. */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#F8F7F4',
        'surface-low': '#F1EFEA',
        'surface-muted': '#ECEAE4',
        onyx: { DEFAULT: '#0D0D11', card: '#16161C', light: '#21212A' },
        lime: { DEFAULT: '#CCFF00', hover: '#B8E600', muted: '#EEFF99' },
        coral: { DEFAULT: '#FF4D2D', hover: '#E83A1B', light: '#FFEAE5', dark: '#C72B10' },
        // Darker than Stitch's Ink Ghost (#888891), which is only ~3:1 on paper. Use this for readable text.
        'ink-muted': '#5B5B66',
      },
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        grotesk: ['var(--font-hanken)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        tactile: '3px 3px 0px #0D0D11',
        'tactile-lg': '5px 5px 0px #0D0D11',
        'tactile-sm': '1px 1px 0px #0D0D11',
        'focus-lime': '2px 2px 0px #CCFF00',
      },
      borderRadius: { DEFAULT: '0px' },
    },
  },
  plugins: [],
};
