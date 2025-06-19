import js from '@eslint/js'
import globals from 'globals'

export default [
    { ignores: ['dist'] },
    {
        files: ['**/*.{js,ts}'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.node,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            indent: ['error', 4],
            semi: ['error', 'never'],
            quotes: ['error', 'single'],
            'comma-dangle': ['error', 'never'],
            'arrow-parens': ['error', 'as-needed'],
            'prefer-const': 'warn',
            'no-var': 'error',
            'no-unused-vars': 'warn',
            'no-console': 'off'
        }
    }
]
