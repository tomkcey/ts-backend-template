import supertest from "supertest";
import { KoaHttp } from "./koa";
import { sequential } from "../../../utils/async";

const HEADER_KEY = "X-Request-Id";

describe(KoaHttp.name, () => {
	afterEach(() => {
		KoaHttp.cleanup();
	});

	it("binds the controller on specified path and method, then responds to incoming requests", async () => {
		const http = KoaHttp.getKoaHttpServer();

		http.createController("/ping", "get", async (_req, res) =>
			KoaHttp.withResponse(res)
				.status(200)
				.headers({ "Content-Type": "text/plain" })
				.body("pong")
				.build(),
		);

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

		http.createController("/ping", "get", async (_req, res) =>
			KoaHttp.withResponse(res)
				.status(200)
				.headers({ "Content-Type": "text/plain" })
				.body("pong")
				.build(),
		);

		expect(() =>
			http.createController("/ping", "get", async (_req, res) => res),
		).toThrow();
	});

	it("binds the middleware at the app level, acting on all incoming requests", async () => {
		const http = KoaHttp.getKoaHttpServer();

		let counter = 0;

		http.middleware(async (_req, res, next) => {
			res.set(HEADER_KEY, (++counter).toString());
			await next();
		}).createController("/ping", "get", async (_req, res) =>
			KoaHttp.withResponse(res)
				.status(200)
				.headers({ "Content-Type": "text/plain" })
				.body("pong")
				.build(),
		);

		const mockApp = supertest(http.app.callback());

		const matrix = [
			{
				path: "/ping",
				body: "pong",
				headers: {
					"content-type": "text/plain",
					[HEADER_KEY.toLowerCase()]: "1",
				},
			},
			{
				path: "/ping",
				body: "pong",
				headers: {
					"content-type": "text/plain",
					[HEADER_KEY.toLowerCase()]: "2",
				},
			},
		] as const;

		await sequential(matrix, async ({ body, path, headers }) => {
			const response = await mockApp.get(path);

			expect(response.statusCode).toEqual(200);
			expect(response.header).toEqual(expect.objectContaining(headers));
			expect(response.text).toEqual(body);
		});
	});

	it("binds the middleware at the router (path-specific) level, acting on incoming requests on that path", async () => {
		const http = KoaHttp.getKoaHttpServer();

		let counter = 0;

		http.createController("/ping", "get", async (_req, res) =>
			KoaHttp.withResponse(res)
				.status(200)
				.headers({ "Content-Type": "text/plain" })
				.body("pong")
				.build(),
		)
			.middleware(async (_req, res, next) => {
				res.set(HEADER_KEY, (++counter).toString());
				await next();
			}, "/pingme" as any)
			.createController("/pingme" as any, "get", async (_req, res) =>
				KoaHttp.withResponse(res)
					.status(200)
					.headers({ "Content-Type": "text/plain" })
					.body("pongme")
					.build(),
			);

		const mockApp = supertest(http.app.callback());

		const matrix = [
			{
				path: "/ping",
				body: "pong",
				headers: {
					"content-type": "text/plain",
				},
			},
			{
				path: "/pingme",
				body: "pongme",
				headers: {
					"content-type": "text/plain",
					[HEADER_KEY.toLowerCase()]: "1",
				},
			},
		] as const;

		await sequential(matrix, async ({ body, path, headers }) => {
			const response = await mockApp.get(path);

			expect(response.statusCode).toEqual(200);
			expect(response.header).toEqual(expect.objectContaining(headers));
			expect(response.text).toEqual(body);
		});
	});
});
