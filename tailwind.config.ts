import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
            'brand-green': '#22C55E',
            'sidebar-active': {
                DEFAULT: '#EEF2FF', // bg
                foreground: '#4F46E5', // text
            },
            surface: '#FFFFFF',
            border: '#E5E7EB',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
        animation: {
            'spin-slow': 'spin 12s linear infinite',
            blob: 'blob 7s infinite',
            'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
            'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        },
        keyframes: {
            blob: {
                '0%': { transform: 'translate(0px, 0px) scale(1)' },
                '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                '100%': { transform: 'translate(0px, 0px) scale(1)' },
            },
            'bounce-slow': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-5px)' },
            },
            'glow-pulse': {
                '0%, 100%': { 
                    boxShadow: '0 0 15px rgba(34, 197, 94, 0.4), 0 0 30px rgba(34, 197, 94, 0.2)',
                },
                '50%': { 
                    boxShadow: '0 0 25px rgba(34, 197, 94, 0.8), 0 0 50px rgba(34, 197, 94, 0.5), 0 0 75px rgba(34, 197, 94, 0.3)',
                },
            },
        },
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
