import supertest from "supertest";
import { KoaHttp } from "./koa";

describe(KoaHttp.name, () => {
	afterEach(() => {
		KoaHttp.cleanup();
	});

	it("binds the controller on specified path and method, then responds to incoming requests", async () => {
		const http = KoaHttp.getKoaHttpServer();

		http.createController("/ping", "get", async (_req, res) => {
			res.status = 200;
			res.set("Content-Type", "text/plain");
			res.body = "pong";
			return res;
		});

		const mockApp = supertest(http.app.callback());

		const response = await mockApp.get("/ping");

		expect(response.statusCode).toEqual(200);
		expect(response.header).toEqual(
			expect.objectContaining({ "content-type": "text/plain" }),
		);
		expect(response.text).toEqual("pong");
	});

	it("throws when a controller is already bound to specified path and method", async () => {
		const http = KoaHttp.getKoaHttpServer();

		http.createController("/ping", "get", async (_req, res) => {
			res.status = 200;
			res.set("Content-Type", "text/plain");
			res.body = "pong";
			return res;
		});

		expect(() =>
			http.createController("/ping", "get", async (_req, res) => res),
		).toThrow();
	});

	it("binds the middleware at the app level, acting on all incoming requests", async () => {
		const http = KoaHttp.getKoaHttpServer();

		const HEADER_KEY = "X-Request-Id";
		let counter = 0;

		http.middleware(async (_req, res, next) => {
			res.set(HEADER_KEY, (++counter).toString());
			await next();
		})
			.createController("/ping", "get", async (_req, res) => {
				res.status = 200;
				res.set("Content-Type", "text/plain");
				res.body = "pong";
				return res;
			})
			.createController("/v1", "get", async (_req, res) => {
				res.status = 200;
				res.set("Content-Type", "text/plain");
				res.body = "Hello world!";
				return res;
			});

		const mockApp = supertest(http.app.callback());

		const responsePing = await mockApp.get("/ping");
		const responseV1 = await mockApp.get("/v1");

		expect(responsePing.statusCode).toEqual(200);
		expect(responsePing.header).toEqual(
			expect.objectContaining({
				"content-type": "text/plain",
				[HEADER_KEY.toLowerCase()]: "1",
			}),
		);
		expect(responsePing.text).toEqual("pong");

		expect(responseV1.statusCode).toEqual(200);
		expect(responseV1.header).toEqual(
			expect.objectContaining({
				"content-type": "text/plain",
				[HEADER_KEY.toLowerCase()]: "2",
			}),
		);
		expect(responseV1.text).toEqual("Hello world!");
	});

	it("binds the middleware at the router (path-specific) level, acting on incoming requests on that path", async () => {
		const http = KoaHttp.getKoaHttpServer();

		const HEADER_KEY = "X-Request-Id";
		let counter = 0;

		http.createController("/ping", "get", async (_req, res) => {
			res.status = 200;
			res.set("Content-Type", "text/plain");
			res.body = "pong";
			return res;
		})
			.middleware(async (_req, res, next) => {
				res.set(HEADER_KEY, (++counter).toString());
				await next();
			}, "/v1")
			.createController("/v1", "get", async (_req, res) => {
				res.status = 200;
				res.set("Content-Type", "text/plain");
				res.body = "Hello world!";
				return res;
			});

		const mockApp = supertest(http.app.callback());

		const responsePing = await mockApp.get("/ping");
		const responseV1 = await mockApp.get("/v1");

		expect(responsePing.statusCode).toEqual(200);
		expect(responsePing.header).toEqual(
			expect.objectContaining({
				"content-type": "text/plain",
			}),
		);
		expect(responsePing.header[HEADER_KEY.toLowerCase()]).toBeUndefined();
		expect(responsePing.text).toEqual("pong");

		expect(responseV1.statusCode).toEqual(200);
		expect(responseV1.header).toEqual(
			expect.objectContaining({
				"content-type": "text/plain",
				[HEADER_KEY.toLowerCase()]: "1",
			}),
		);
		expect(responseV1.text).toEqual("Hello world!");
	});
});
