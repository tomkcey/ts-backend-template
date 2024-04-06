import supertest from "supertest";
import { app } from "../app";
import { auth } from "./auth";
import { config } from "../utils/config";

describe(auth.name, () => {
	let mockApp = supertest(app.callback());

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
