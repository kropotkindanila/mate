import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-weak': 'var(--bg-weak-50)',
        'bg-white': 'var(--bg-white-0)',
        'bg-soft': 'var(--bg-soft-200)',
        'text-strong': 'var(--text-strong-950)',
        'text-sub': 'var(--text-sub-600)',
        'text-soft': 'var(--text-soft-400)',
        'icon-strong': 'var(--icon-strong-950)',
        'icon-soft': 'var(--icon-soft-400)',
        'orange-brand': 'var(--orange-500)',
        'stroke-soft': 'var(--stroke-soft-200)',
      },
      borderRadius: {
        '4': '4px',
        '8': '8px',
        '10': '10px',
        '16': '16px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
