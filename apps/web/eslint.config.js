import planetConfig from 'eslint-config-planet/react.js'

export default [
  ...planetConfig,
  {
    rules: {
      // React 19 / Next.js doesn't require React import
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // TypeScript handles prop types
      'react/prop-types': 'off',
    },
  },
]
