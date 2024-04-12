import { MaybePromise } from "./async";

export async function executionTime<T>(
	fn: () => MaybePromise<T>,
): Promise<{ result: T; timeInMs: number }> {
	const start = Date.now();
	const result = await fn();
	const end = Date.now();
	return { result, timeInMs: end - start };
}
