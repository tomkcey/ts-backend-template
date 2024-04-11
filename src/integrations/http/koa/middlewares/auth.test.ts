import supertest from "supertest";
import { auth } from "./auth";
import TestAgent from "supertest/lib/agent";
import { KoaHttp } from "../koa";
import { error } from "./errors";
import { config } from "../../../../utils/config";

describe(auth.name, () => {
	let mockApp: TestAgent;

	beforeEach(async () => {
		const http = KoaHttp.getKoaHttpServer(error, auth).createController(
			"/ping",
			"get",
			async (_, res) => {
				res.status = 204;
				return res;
			},
		);

		mockApp = supertest(http.app.callback());
	});

	afterEach(async () => {
		KoaHttp.cleanup();
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
