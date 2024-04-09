import supertest from "supertest";
import { bootstrap } from "../app";
import { config } from "../utils/config";
import { RateLimiter } from "./limiting";
import { sequential } from "../utils/async";
import TestAgent from "supertest/lib/agent";
import { sleep } from "../test/utils";
import { getRedisCache } from "../cache/redis";

describe(RateLimiter.name, () => {
	let mockApp: TestAgent;

	beforeEach(async () => {
		const { cache } = await getRedisCache();
		await cache.clear();

		const limiter = RateLimiter.withCache(cache);
		const app = await bootstrap(limiter);

		mockApp = supertest(app.callback());
	});

	afterEach(async () => {
		RateLimiter.cleanup();

		const { cleanup } = await getRedisCache();
		await cleanup();
	});

	it("returns 429 Too Many Requests when the rate limit has been reached, and the target's route usual return when the ban timer ends", async () => {
		const length = config.rateLimit.nReq + 1;
		const responses = await sequential(
			Array.from({ length }, (_) => _),
			async () => mockApp.get("/ping").set("x-api-key", config.apiKey),
		);

		const okResponses = responses.filter(
			(response) => response.statusCode < 400,
		);

		const errorResponses = responses.filter(
			(response) => response.statusCode >= 400,
		);

		for (const response of okResponses) {
			expect(response.statusCode).toEqual(204);
		}

		for (const response of errorResponses) {
			expect(response.statusCode).toEqual(429);
		}

		const response = await sleep(config.rateLimit.durationInMs).then(() =>
			mockApp.get("/ping").set("x-api-key", config.apiKey),
		);

		expect(response.statusCode).toEqual(204);
	});
});
