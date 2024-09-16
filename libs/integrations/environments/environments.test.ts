import { getEnvironmentVariables } from "./environments";

describe(getEnvironmentVariables.name, () => {
	const key = "TEST_VALUE";
	const value = "test";

	afterEach(() => {
		process.env[key] = undefined;
	});

	it("throws if the target environment variable isn't defined", async () => {
		expect(() =>
			getEnvironmentVariables((assert) => {
				return assert(key, (v) => v);
			}),
		).toThrow();
	});

	it("returns the value for target environment variable", async () => {
		process.env[key] = value;

		const result = getEnvironmentVariables((assert) => {
			return assert(key, (v) => v);
		});

		expect(result).toEqual(value);
	});

	it("returns the value mapped to some other type for target environment variable", async () => {
		process.env[key] = "1";

		const result = getEnvironmentVariables((assert) => {
			return assert(key, (v) => parseInt(v));
		});

		expect(result).toEqual(1);
	});
});
