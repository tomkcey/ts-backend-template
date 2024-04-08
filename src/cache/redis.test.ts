import { randomUUID } from "crypto";
import { getRedisCache } from "./redis";
import { sequential } from "../utils/async";

describe(getRedisCache.name, () => {
	afterAll(async () => {
		const client = await getRedisCache();
		await client.disconnect();
	});

	beforeEach(async () => {
		const client = await getRedisCache();
		await client.clear();
	});

	it("returns a value if one was assigned to provided key and not yet expired", async () => {
		const KEY = randomUUID();
		const COUNTER = 0;

		const client = await getRedisCache();

		await client.set(KEY, COUNTER, 1);

		const resultBeforeExpiration = await client.get(KEY);

		await new Promise<void>((resolve) => setTimeout(resolve, 1000));
		const resultAfterExpiration = await client.get(KEY);

		expect(resultBeforeExpiration).toEqual(COUNTER);
		expect(resultAfterExpiration).toBeUndefined();
	});

	it("returns the keys sequentially", async () => {
		const keys = Array.from({ length: 10 }, () => randomUUID());

		const client = await getRedisCache();

		await sequential(keys, async (key) => client.set(key, 1));

		for await (const key of client.keys()) {
			expect(keys).toContain(key);
		}
	});
});
