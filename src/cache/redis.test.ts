import { randomUUID } from "crypto";
import { getRedisCache } from "./redis";
import { sequential } from "../utils/async";
import { sleep } from "../test/utils";

describe(getRedisCache.name, () => {
	beforeEach(async () => {
		const { cache } = await getRedisCache();
		await cache.clear();
	});

	afterEach(async () => {
		const { cleanup } = await getRedisCache();
		await cleanup();
	});

	it("returns a value if one was assigned to provided key and not yet expired", async () => {
		const KEY = randomUUID();
		const COUNTER = 0;

		const { cache } = await getRedisCache();

		await cache.set(KEY, COUNTER, 1);

		const resultBeforeExpiration = await cache.get(KEY);

		await sleep(1000);

		const resultAfterExpiration = await cache.get(KEY);

		expect(resultBeforeExpiration).toEqual(COUNTER);
		expect(resultAfterExpiration).toBeUndefined();
	});

	it("returns the keys sequentially", async () => {
		const keys = Array.from({ length: 10 }, () => randomUUID());

		const { cache } = await getRedisCache();

		await sequential(keys, async (key) => cache.set(key, 1));

		for await (const key of cache.keys()) {
			expect(keys).toContain(key);
		}
	});
});
