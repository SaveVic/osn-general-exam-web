import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import tailwind from 'eslint-plugin-tailwindcss'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: {
      tailwindcss: tailwind,
    },
    rules: {
      ...tailwind.configs.recommended.rules,
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/enforces-shorthand': 'warn',
      'tailwindcss/no-unnecessary-arbitrary-value': 'warn',
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': [
        'warn',
        {
          whitelist: [
            'prose.*',
            'katex.*',
            'tabular-timer',
            '(?:data-\\[[^\\]]+\\]:)?(?:animate-in|animate-out|fade-in.*|fade-out.*|zoom-in.*|zoom-out.*|slide-in-.*|slide-out-.*)',
          ],
        },
      ],
    },
    settings: {
      tailwindcss: {
        cssConfigPath: './app/globals.css',
        functions: ['cn', 'cva', 'clsx', 'twMerge'],
      },
    },
  },
]

export default eslintConfig
