import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import planetConfig from 'eslint-config-planet/react.js'

export default [
  ...planetConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // React 19 / Next.js doesn't require React import
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // TypeScript handles prop types
      'react/prop-types': 'off',
      // Use TypeScript's unused vars rule instead
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]
