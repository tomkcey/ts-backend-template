import supertest from "supertest";
import { RateLimiter } from "./limiting";
import TestAgent from "supertest/lib/agent";
import { error } from "./errors";
import { RedisCache } from "../../../cache";
import { KoaHttp } from "../koa";
import { config } from "../../../../utils/config";
import { sequential } from "../../../../utils/async";
import { sleep } from "../../../../test/utils";

describe(RateLimiter.name, () => {
	let mockApp: TestAgent;

	beforeEach(async () => {
		const cache = await RedisCache.getCache();
		await cache.clear();

		const limiter = RateLimiter.withCache(cache);

		const http = KoaHttp.getKoaHttpServer(error, async (req, res, next) =>
			limiter.middleware(req, res, next),
		).createController("/ping", "get", async (_, res) => {
			res.status = 204;
			return res;
		});

		mockApp = supertest(http.app.callback());
	});

	afterEach(async () => {
		KoaHttp.cleanup();
		RateLimiter.cleanup();
		await RedisCache.cleanup();
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
