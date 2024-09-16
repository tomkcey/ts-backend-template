export async function sequential<I, O>(
	input: Iterable<I>,
	fn: (input: I, idx: number, signal?: AbortSignal) => Promise<O>,
	timeout?: number | AbortSignal,
): Promise<O[]> {
	let breakout = false;
	let controller: AbortController | undefined = undefined;

	if (timeout !== undefined) {
		const signal = timeout instanceof AbortSignal ? timeout : AbortSignal.timeout(timeout);
		signal.addEventListener("abort", () => {
			breakout = true;
			controller?.abort();
		});
	}

	const output: O[] = [];

	let idx = 0;

	for (const i of input) {
		if (breakout) {
			break;
		}

		controller = timeout ? new AbortController() : undefined;

		const result = await fn(i, idx, controller?.signal);

		output.push(result);

		controller = undefined;
		idx++;
	}

	return output;
}

export async function parallel<I, O>(
	input: Iterable<I>,
	fn: (input: I, idx: number, signal?: AbortSignal) => Promise<O>,
	timeout?: number | AbortSignal,
): Promise<O[]> {
	const controllers = timeout !== undefined ? new Map<number, AbortController>() : undefined;
	const globalTimeout =
		timeout instanceof AbortSignal
			? timeout
			: typeof timeout === "number"
				? AbortSignal.timeout(timeout)
				: undefined;

	globalTimeout?.addEventListener("abort", () => {
		if (controllers !== undefined) {
			for (const ctrl of controllers.values()) {
				ctrl.abort();
			}
		}
	});

	return Promise.all(
		Array.from(input).map((i, idx) => {
			const ctrl = controllers !== undefined ? new AbortController() : undefined;
			if (ctrl !== undefined) {
				controllers?.set(idx, ctrl);
			}

			return fn(i, idx, ctrl?.signal);
		}),
	);
}

export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const timeout = setTimeout(resolve, ms);
		signal?.addEventListener("abort", () => {
			resolve();
			clearTimeout(timeout);
		});
	});
}
