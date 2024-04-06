import Koa from "koa";
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";

export const store = new AsyncLocalStorage<string>();

/**
 * Middleware to trace the request.
 * Uses the x-request-id from the incoming request or fields that header with a new id.
 */
export async function trace(ctx: Koa.Context, next: Koa.Next) {
	const requestId = ctx.headers["x-request-id"];
	if (!requestId) {
		ctx.headers["x-request-id"] = randomUUID();
	}
	return store.run(ctx.headers["x-request-id"] as string, async () => {
		return next();
	});
}
