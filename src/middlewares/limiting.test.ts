import supertest, { Response } from "supertest";
import { app } from "../app";
import { config } from "../utils/config";
import { RateLimiter } from "./limiting";
import { sequential } from "../utils/async";

describe(RateLimiter.name, () => {
	let mockApp = supertest(app.callback());

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

		const response = await new Promise<Response>((resolve) =>
			setTimeout(
				() =>
					mockApp
						.get("/ping")
						.set("x-api-key", config.apiKey)
						.then((r) => resolve(r)),
				config.rateLimit.duration,
			),
		);

		expect(response.statusCode).toEqual(204);
	});
});
