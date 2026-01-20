import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@forky/ui',
              message: 'State must not depend on UI packages.',
            },
            {
              name: '@forky/app-ui',
              message: 'State must not depend on UI packages.',
            },
          ],
          patterns: ['@forky/ui/*', '@forky/app-ui/*'],
        },
      ],
    },
  }
)
