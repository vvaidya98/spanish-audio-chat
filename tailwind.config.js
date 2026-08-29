/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        ink: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          faint: 'var(--color-text-faint)',
        },
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
          text: 'var(--color-primary-text)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          light: 'var(--color-secondary-light)',
          text: 'var(--color-secondary-text)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
        },
        danger: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)',
        },
        warn: {
          light: 'var(--color-warning-light)',
          text: 'var(--color-warning-text)',
        },
        info: {
          light: 'var(--color-info-light)',
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      fontSize: {
        'heading-1': ['1.75rem', { lineHeight: '2.1rem', fontWeight: '700' }], // 28px
        'heading-2': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '700' }], // 18px
        body: ['1rem', { lineHeight: '1.5rem' }], // 16px
        small: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
      },
    },
  },
  plugins: [],
}
