// https://jestjs.io/docs/en/configuration.html
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",

	verbose: true,

	testMatch: ["**/*.test.ts", "**/*.spec.ts"],

	collectCoverage: true,
	collectCoverageFrom: ["apps/*", "apps/**/*.ts", "libs/*", "libs/**/*.ts"],

	coverageReporters: ["lcov"],
	coverageDirectory: "./coverage",
	coveragePathIgnorePatterns: [
		"/node_modules/",
		"/dist/",
		"/coverage/",
		"/.git/",
		"/.vscode/",
		"index.ts",
	],

	maxWorkers: "100%",
};
