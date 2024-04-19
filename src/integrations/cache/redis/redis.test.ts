import { randomUUID } from "crypto";
import { Cache } from "./redis";
import { sequential } from "../../../utils/async";
import { sleep } from "../../../test/utils";
import { isNil } from "../../../utils/coersion";

describe(Cache.name, () => {
	const cache = new Cache();

	beforeEach(async () => {
		await cache.clear();
	});

	afterEach(async () => {
		await cache.disconnect();
	});

	it("returns a value if one was assigned to provided key and not yet expired", async () => {
		const KEY = randomUUID();
		const COUNTER = 0;

		await cache.set(KEY, COUNTER.toString(), 1);

		const resultBeforeExpiration = await cache.get(KEY);
		if (isNil(resultBeforeExpiration)) {
			fail("The cache should return a value.");
		}

		await sleep(1100);

		const resultAfterExpiration = await cache.get(KEY);

		expect(parseInt(resultBeforeExpiration, 10)).toEqual(COUNTER);
		expect(resultAfterExpiration).toBeNull();
	});

	it("returns the keys sequentially", async () => {
		const keys = Array.from({ length: 10 }, () => randomUUID());

		await sequential(keys, async (key) =>
			cache.set(key, Number(1).toString()),
		);

		for await (const key of cache.keys()) {
			expect(keys).toContain(key);
		}
	});
});
