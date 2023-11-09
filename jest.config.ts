import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
	verbose: true,
	testEnvironment: 'node',
	transform: {
		'^.+\\.ts$': ['ts-jest', { useESM: true }]
	},
	testRegex: 'src/.*\\.test\\.ts',
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
}

export default config;
