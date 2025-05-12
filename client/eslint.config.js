import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
    { ignores: ['dist'] },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module'
            }
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            indent: ['error', 4],
            semi: ['error', 'never'],
            quotes: ['error', 'single'],
            'jsx-quotes': ['error', 'prefer-double'],
            'comma-dangle': ['error', 'never'],
            'arrow-parens': ['error', 'as-needed'],
            'prefer-const': 'warn',
            'no-var': 'error',
            'no-unused-vars': 'warn',
            'no-console': 'off',
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true }
            ]
        }
    }
]
