import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@forky/api',
              message: 'Use @forky/state or server routes instead of backend packages.',
            },
            {
              name: '@forky/client-api',
              message: 'Use @forky/state for API access.',
            },
          ],
          patterns: ['@forky/client-api/*'],
        },
      ],
    },
  },
]);

export default eslintConfig;
