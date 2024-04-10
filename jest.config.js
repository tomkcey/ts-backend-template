// https://jestjs.io/docs/en/configuration.html
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",

	verbose: true,

	testMatch: ["**/*.test.ts", "**/*.spec.ts"],

	coverageDirectory: "./coverage",
	collectCoverage: true,
	collectCoverageFrom: ["src/*", "src/**/*.ts"],
	coverageReporters: ["lcov"],
	testPathIgnorePatterns: ["src/index.ts"],
	coveragePathIgnorePatterns: ["src/index.ts"],

	maxWorkers: "25%",

	globalSetup: "<rootDir>/src/test/setup-global.ts",
	globalTeardown: "<rootDir>/src/test/teardown-global.ts",
};
