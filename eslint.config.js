import js from '@eslint/js';
import ts from 'typescript-eslint';
import parser from '@typescript-eslint/parser';
import eslint_plugin from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	// Type-aware rules. They need a TypeScript program, so they are scoped to the
	// files covered by tsconfig.json - applying them repo-wide would make ESLint
	// fail on config files that are not part of the project.
	...ts.configs.recommendedTypeChecked.map((config) => ({
		...config,
		files: ['src/**/*.ts'],
	})),
	{
		ignores: [
			'coverage/**/*.*',
			'dist/**/*.*',
			'docs/**/*.*',
		]
	},
	{
		files: [
			'src/**/*.ts',
		],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				browser: false,
				es6: true,
				node: true
			},
			parser,
			parserOptions: {
				sourceType: 'module',
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'@typescript-eslint': eslint_plugin,
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: [
			'src/**/*.test.ts',
		],
		rules: {
			// Test doubles implement the Promise-returning Reader interface with data
			// that is already in memory, so `async` without `await` is intentional here.
			'@typescript-eslint/require-await': 'off',
		}
	},
	prettier,
]
