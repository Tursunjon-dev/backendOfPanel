module.exports = {
	parser: '@typescript-eslint/parser',
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	env: {
		node: true,
		es6: true,
	},
	rules: {
		// TypeScript
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
			},
		],

		// General
		'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
		'no-debugger': 'warn',
		eqeqeq: ['error', 'always'],
		curly: 'error',
		semi: ['error', 'always'],
		quotes: ['error', 'single', { avoidEscape: true }],
		indent: ['error', 2],
		'comma-dangle': ['error', 'always-multiline'],
		'object-curly-spacing': ['error', 'always'],
		'array-bracket-spacing': ['error', 'never'],
		'space-before-function-paren': [
			'error',
			{
				anonymous: 'always',
				named: 'never',
				asyncArrow: 'always',
			},
		],

		// Best practices
		'no-var': 'error',
		'prefer-const': 'error',
		'no-else-return': 'error',
		'no-useless-return': 'error',
		'no-useless-concat': 'error',
		'prefer-template': 'error',
	},
	ignorePatterns: ['dist/**', 'node_modules/**', '*.js', '*.d.ts'],
}
