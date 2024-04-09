import supertest from "supertest";
import { bootstrap } from "../app";
import { auth } from "./auth";
import { config } from "../utils/config";
import TestAgent from "supertest/lib/agent";
import { getRedisRateLimiter } from "./limiting";
import { getRedisCache } from "../cache/redis";

describe(auth.name, () => {
	let mockApp: TestAgent;

	beforeEach(async () => {
		const { redisCache } = await getRedisCache();
		await redisCache.clear();

		const { redisRateLimiter } = await getRedisRateLimiter();
		const app = await bootstrap(redisRateLimiter);

		mockApp = supertest(app.callback());
	});

	afterEach(async () => {
		const { cleanupRedisRateLimiter } = await getRedisRateLimiter();
		cleanupRedisRateLimiter();

		const { cleanupRedisCache } = await getRedisCache();
		await cleanupRedisCache();
	});

	it("returns 401 Unauthorized when no api key provided", async () => {
		const response = await mockApp.get("/ping");
		expect(response.statusCode).toEqual(401);
	});

	it("returns 401 Unauthorized when the wrong api key provided", async () => {
		const response = await mockApp
			.get("/ping")
			.set("x-api-key", config.apiKey + "willfail");
		expect(response.statusCode).toEqual(401);
	});

	it("doesn't return 401 Unauthorized when the right api key provided", async () => {
		const response = await mockApp
			.get("/ping")
			.set("x-api-key", config.apiKey);
		expect(response.statusCode).toEqual(204);
	});
});
