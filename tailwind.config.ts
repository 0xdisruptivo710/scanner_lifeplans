import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const rgbVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        background: rgbVar('--background'),
        surface: rgbVar('--surface'),
        foreground: rgbVar('--foreground'),
        muted: {
          DEFAULT: rgbVar('--muted'),
          foreground: rgbVar('--muted-foreground'),
        },
        'subtle-foreground': rgbVar('--subtle-foreground'),
        card: {
          DEFAULT: rgbVar('--card'),
          foreground: rgbVar('--card-foreground'),
        },
        border: rgbVar('--border'),
        'border-strong': rgbVar('--border-strong'),
        input: rgbVar('--input'),
        primary: {
          DEFAULT: rgbVar('--primary'),
          foreground: rgbVar('--primary-foreground'),
          soft: rgbVar('--primary-soft'),
          'soft-foreground': rgbVar('--primary-soft-foreground'),
        },
        accent: {
          DEFAULT: rgbVar('--accent'),
          foreground: rgbVar('--accent-foreground'),
        },
        success: {
          DEFAULT: rgbVar('--success'),
          foreground: rgbVar('--success-foreground'),
          soft: rgbVar('--success-soft'),
        },
        info: {
          DEFAULT: rgbVar('--info'),
          foreground: rgbVar('--info-foreground'),
          soft: rgbVar('--info-soft'),
        },
        destructive: {
          DEFAULT: rgbVar('--destructive'),
          foreground: rgbVar('--destructive-foreground'),
          soft: rgbVar('--destructive-soft'),
        },
        warning: {
          DEFAULT: rgbVar('--warning'),
          soft: rgbVar('--warning-soft'),
        },
        ring: rgbVar('--ring'),
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: 'var(--radius)',          // 12px
        xl: '14px',
        '2xl': '16px',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'monospace',
        ],
      },
      boxShadow: {
        // AIOS uses very subtle shadows — borders do most of the work.
        card: '0 1px 0 rgb(17 24 39 / 0.02), 0 0 0 0.5px rgb(229 231 235 / 0.6)',
        popover: '0 12px 32px -8px rgb(17 24 39 / 0.12), 0 0 0 1px rgb(229 231 235 / 0.8)',
        focus: '0 0 0 3px rgb(79 70 229 / 0.18)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
