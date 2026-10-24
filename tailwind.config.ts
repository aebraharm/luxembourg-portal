import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          primary: 'var(--brand-primary, #dc2626)',
          primaryHover: 'var(--brand-primary-hover, #b91c1c)',
          sky: 'var(--brand-sky, #0284c7)',
          skyLight: 'var(--brand-sky-light, #e0f2fe)',
          navy: 'var(--brand-navy, #0f172a)',
          navyMuted: '#334155',
          card: '#ffffff',
          border: '#e2e8f0',
          bg: '#f8fafc',
        },
      },
      borderRadius: {
        card: 'var(--border-radius-card, 0.75rem)',
      },
    },
  },
  plugins: [],
};
export default config;
