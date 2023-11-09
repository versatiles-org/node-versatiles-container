import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'node',
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.json', useESM: true }]
	},
	testRegex: 'src/.*\\.test\\.ts',
	//resolver: 'jest-ts-webcompat-resolver',
	moduleNameMapper: { '^(\\.\\.?/.*)\\.js$': '$1' },
}

export default config;
