module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          600: '#5b21b6',
          700: '#4c1d95',
        },
        gray: {
          700: '#374151',
        },
      },
      animation: {
        winnerEffect: 'winnerEffect 1.2s ease-out',
        loserEffect: 'loserEffect 1.2s ease-out',
        fadeIn: 'fadeIn 0.8s ease-in-out',
        moveHorseFast: 'moveHorseFast 1s ease-out forwards',
        moveHorseSlow: 'moveHorseSlow 1s ease-out forwards',
      },
      keyframes: {
        winnerEffect: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        loserEffect: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        moveHorseFast: {
          '0%': { left: '0' },
          '100%': { left: '90%' },
        },
        moveHorseSlow: {
          '0%': { left: '0' },
          '100%': { left: '45%' },
        },
      },
      backgroundImage: {
        racetrack: "url('/images/grass.webp')",
      },
      borderRadius: {
        track: '15px',
      },
      borderColor: {
        track: '#4CAF50',
      },
      zIndex: {
        1: 1, // 숫자로 설정
      },
      fontSize: {
        'track-label': '14px',
        emoji: '24px',
      },
    },
  },
  plugins: [],
};
