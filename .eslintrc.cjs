module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script',
  },
  ignorePatterns: [
    'dist/',
    'uploads/',
    'node_modules/',
    'public/js/socket.js',
    'public/js/webrtc.js',
    'tests/**/*.disabled.js',
  ],
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-prototype-builtins': 'off',
  },
};
