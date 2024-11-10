module.exports = {
  // ESLint 파서 설정
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020, // ECMAScript 버전 설정
    sourceType: 'module', // 모듈 시스템 설정
    ecmaFeatures: {
      jsx: true, // JSX 파싱 활성화
    },
  },
  settings: {
    react: {
      version: 'detect', // 설치된 React 버전에 맞게 자동 설정
    },
  },
  env: {
    browser: true, // 브라우저 환경 설정
    node: true, // Node.js 환경 설정
    es2020: true, // ES2020 구문 지원
  },
  extends: [
    'next/core-web-vitals', // Next.js 권장 규칙
    'plugin:@typescript-eslint/recommended', // TypeScript ESLint 추천 규칙
    'plugin:prettier/recommended', // Prettier와 ESLint 통합
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    // 기존 규칙 유지
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    'react-hooks/exhaustive-deps': 'off',

    // 추가 규칙 설정 가능
    // '@typescript-eslint/no-unused-vars': 'warn',
    // '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  // 추가: 설정 파일에만 규칙 적용
  overrides: [
    {
      files: ['*.cjs'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
