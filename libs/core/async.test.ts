import { parallel, sequential, sleep } from "./async";

const TIMEOUT_MS = 50;

describe(sleep.name, () => {
	it("should resolve after the timeout", async () => {
		const start = Date.now();

		await sleep(TIMEOUT_MS);

		const end = Date.now();

		expect(end - start).toBeGreaterThanOrEqual(TIMEOUT_MS);
	});

	it("should resolve early when the signal is aborted", async () => {
		const start = Date.now();

		const controller = new AbortController();

		setTimeout(() => controller.abort(), TIMEOUT_MS / 2);

		await sleep(TIMEOUT_MS, controller.signal);

		const end = Date.now();

		expect(end - start).toBeLessThan(TIMEOUT_MS);
	});
});

describe(sequential.name, () => {
	it("should return an array of results", async () => {
		const input = [1, 2, 3];
		const fn = async (i: number) => i * 2;

		const result = await sequential(input, fn);

		expect(result).toEqual([2, 4, 6]);
	});

	it("returns early when timeout reached", async () => {
		const input = [1, 2, 3];
		let aborted = false;
		const sleepController = new AbortController();
		const fn = async (i: number, _: number, signal?: AbortSignal) => {
			signal?.addEventListener("abort", () => {
				aborted = signal.aborted;
				sleepController.abort();
			});

			await sleep(TIMEOUT_MS * 2, sleepController.signal);

			if (sleepController.signal.aborted) {
				return;
			}

			return i * 2;
		};

		const result = await sequential(input, fn, TIMEOUT_MS);

		expect(result).toEqual([undefined]);
	});

	it("calls the abort method on controller and returns early when timeout reached", async () => {
		const input = [1, 2, 3];
		let aborted = false;
		const sleepController = new AbortController();
		const fn = async (i: number, _: number, signal?: AbortSignal) => {
			signal?.addEventListener("abort", () => {
				aborted = signal.aborted;
				sleepController.abort();
			});

			await sleep(TIMEOUT_MS * 2, sleepController.signal);

			if (sleepController.signal.aborted) {
				return;
			}

			return i * 2;
		};

		const result = await sequential(input, fn, AbortSignal.timeout(TIMEOUT_MS));

		expect(result).toEqual([undefined]);
		expect(aborted).toBe(true);
	});
});

describe(parallel.name, () => {
	it("should return an array of results", async () => {
		const input = [1, 2, 3];
		const fn = async (i: number) => i * 2;

		const result = await parallel(input, fn);

		expect(result).toEqual([2, 4, 6]);
	});

	it("returns early when timeout reached", async () => {
		const input = [1, 2, 3];
		let aborted = false;
		const sleepController = new AbortController();
		const fn = async (i: number, _: number, signal?: AbortSignal) => {
			signal?.addEventListener("abort", () => {
				aborted = signal.aborted;
				sleepController.abort();
			});

			await sleep(TIMEOUT_MS * 2, sleepController.signal);

			if (sleepController.signal.aborted) {
				return;
			}

			return i * 2;
		};

		const result = await parallel(input, fn, TIMEOUT_MS);

		expect(result).toEqual([undefined, undefined, undefined]);
		expect(aborted).toBe(true);
	});

	it("calls the abort method on controller and returns early when timeout reached", async () => {
		const input = [1, 2, 3];
		let aborted = false;
		const sleepController = new AbortController();
		const fn = async (i: number, _: number, signal?: AbortSignal) => {
			signal?.addEventListener("abort", () => {
				aborted = signal.aborted;
				sleepController.abort();
			});

			await sleep(TIMEOUT_MS * 2, sleepController.signal);

			if (sleepController.signal.aborted) {
				return;
			}

			return i * 2;
		};

		const result = await parallel(input, fn, AbortSignal.timeout(TIMEOUT_MS));

		expect(result).toEqual([undefined, undefined, undefined]);
		expect(aborted).toBe(true);
	});
});
