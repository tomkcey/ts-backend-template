import Koa, {
	DefaultContext,
	DefaultState,
	Next,
	Request,
	Response,
} from "koa";
import KoaRouter from "koa-router";
import { Handler, Http, Method, Middleware } from "../http";
import { logger } from "../../../utils/logging";

/**
 * [Stack Overflow Link](https://stackoverflow.com/a/58436959/11688144)
 */
type Paths<T> = T extends object
	? {
			[K in keyof T]: `/${Exclude<K, symbol>}${"" | `${Paths<T[K]>}`}`;
		}[keyof T]
	: never;

export class KoaHttp implements Http<Request, Response, Next> {
	public app: Koa<DefaultState, DefaultContext> = new Koa();
	protected router = { ping: {} } as const;
	protected routerMap = new Map<Paths<typeof this.router>, KoaRouter>();
	protected routerMethodMap = new Map<
		Paths<typeof this.router>,
		Set<Method>
	>();

	private getRouter(url: Paths<typeof this.router>) {
		const maybeRouter = this.routerMap.get(url);
		if (maybeRouter) {
			return maybeRouter;
		}
		const router = new KoaRouter();
		this.routerMap.set(url, router);
		return router;
	}

	private isMethodAlreadyBound(
		url: Paths<typeof this.router>,
		method: Method,
	) {
		const maybeSet = this.routerMethodMap.get(url);
		if (!maybeSet) {
			const set = new Set<Method>();
			set.add(method);
			this.routerMethodMap.set(url, set);
			return false;
		}

		const maybeMethod = maybeSet.has(method);
		if (maybeMethod) {
			return true;
		}

		maybeSet.add(method);
		this.routerMethodMap.set(url, maybeSet);
		return false;
	}

	public createController(
		url: Paths<typeof this.router>,
		method: Method,
		handler: Handler<Request, Response>,
	) {
		const router = this.getRouter(url);
		if (this.isMethodAlreadyBound(url, method)) {
			throw new Error(`Method ${method} already bound to ${url}`);
		}

		router[method](url, async (ctx) => handler(ctx.request, ctx.response));
		this.app.use(router.routes());
		return this;
	}

	public middleware(
		handler: Middleware<Request, Response, Next>,
		url?: Paths<typeof this.router>,
	) {
		const app = (() => {
			if (url) {
				const router = this.getRouter(url);
				if (router) {
					return router;
				}
			}
			return this.app;
		})();

		app.use(async (ctx, next) => handler(ctx.request, ctx.response, next));

		return this;
	}

	async start(port: number) {
		this.app.listen(port, () => {
			logger.info(`Listening on port ${port}`);
		});
	}
}

export namespace KoaHttp {
	let server: KoaHttp | null = null;

	export function getKoaHttpServer(
		...middlewares: Middleware<Request, Response, Next>[]
	) {
		if (!server) {
			const http = new KoaHttp();
			server = middlewares.reduce(
				(acc, cur) => acc.middleware(cur),
				http,
			);
		}
		return server;
	}

	export function cleanup() {
		if (server) {
			server.app.removeAllListeners();
			server = null;
		}
	}

	class KoaResponseBuilder {
		constructor(private response: Koa.Response) {}

		status(status: number) {
			this.response.status = status;
			return this;
		}

		body(body: string) {
			this.response.body = body;
			return this;
		}

		headers(headers: Record<string, string>) {
			for (const [key, value] of Object.entries(headers)) {
				this.response.set(key, value);
			}
			return this;
		}

		build(): Koa.Response {
			return this.response;
		}
	}

	export function withResponse(response: Koa.Response): KoaResponseBuilder {
		return new KoaResponseBuilder(response);
	}
}
