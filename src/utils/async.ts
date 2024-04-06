export type MaybePromise<T> = T | Promise<T>;

export async function sequential<T, U>(
	arr: T[],
	fn: (x: T, idx: number) => Promise<U>,
): Promise<U[]> {
	const results: U[] = [];

	let idx = 0;

	for (const item of arr) {
		const r = await fn(item, idx);
		results.push(r);
		idx++;
	}

	return results;
}
