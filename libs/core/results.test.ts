import { Result, Failure, Success } from "./results";

describe(Result.name, () => {
	const SUCCESS_VALUE = 42;
	const FAILURE_REASON = "oh no!";
	const success = new Success(SUCCESS_VALUE);
	const failure = new Failure(FAILURE_REASON);

	it("returns true if the result is a Success, false if it's a failure", () => {
		expect(Result.ok(success)).toBe(true);
		expect(success.ok()).toBe(true);

		expect(Result.ok(failure)).toBe(false);
		expect(failure.ok()).toBe(false);
	});

	it("returns false if the result is a Success, true if it's a failure", () => {
		expect(Result.err(success)).toBe(false);
		expect(success.err()).toBe(false);

		expect(Result.err(failure)).toBe(true);
		expect(failure.err()).toBe(true);
	});

	it("returns the value encapsulated by the Success", () => {
		expect(success.unwrap()).toBe(SUCCESS_VALUE);
	});

	it("returns the reason encapsulated by the Failure", () => {
		expect(failure.unwrap()).toBe(FAILURE_REASON);
	});

	it("throws an error using the reason encapsulated by the Failure", () => {
		expect(() => failure.throw()).toThrow(FAILURE_REASON);
	});

	it("throws an error using the default error constructor if none is provided", () => {
		expect(() => failure.throw()).toThrow(Error);
	});

	it("throws an error using the provided error constructor", () => {
		class CustomError extends Error {}
		const failure = new Failure(FAILURE_REASON, CustomError);
		expect(() => failure.throw()).toThrow(CustomError);
	});
});
