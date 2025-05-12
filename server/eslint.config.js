import globals from 'globals'

const lintConfig = [
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.node,
            sourceType: 'module'
        },
        rules: {
            indent: ['error', 4],
            semi: ['error', 'never'],
            quotes: ['error', 'single'],
            'jsx-quotes': ['error', 'prefer-double'],
            'comma-dangle': ['error', 'never'],
            'arrow-parens': ['error', 'as-needed'],
            'prefer-const': 'warn',
            'no-var': 'error',
            'no-unused-vars': 'warn',
            'no-console': 'off'
        }
    }
]

export default lintConfig
