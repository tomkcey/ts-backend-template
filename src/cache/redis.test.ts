import { randomUUID } from "crypto";
import { getRedisCache } from "./redis";
import { sequential } from "../utils/async";
import { sleep } from "../test/utils";

describe(getRedisCache.name, () => {
	beforeEach(async () => {
		const { redisCache } = await getRedisCache();
		await redisCache.clear();
	});

	afterEach(async () => {
		const { cleanupRedisCache } = await getRedisCache();
		await cleanupRedisCache();
	});

	it("returns a value if one was assigned to provided key and not yet expired", async () => {
		const KEY = randomUUID();
		const COUNTER = 0;

		const { redisCache } = await getRedisCache();

		await redisCache.set(KEY, COUNTER, 1);

		const resultBeforeExpiration = await redisCache.get(KEY);

		await sleep(1100);
		const resultAfterExpiration = await redisCache.get(KEY);

		expect(resultBeforeExpiration).toEqual(COUNTER);
		expect(resultAfterExpiration).toBeUndefined();
	});

	it("returns the keys sequentially", async () => {
		const keys = Array.from({ length: 10 }, () => randomUUID());

		const { redisCache } = await getRedisCache();

		await sequential(keys, async (key) => redisCache.set(key, 1));

		for await (const key of redisCache.keys()) {
			expect(keys).toContain(key);
		}
	});
});
