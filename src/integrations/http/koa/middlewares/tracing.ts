import Koa from "koa";
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";

export const store = new AsyncLocalStorage<string>();

/**
 * Middleware to trace the request.
 * Uses the x-request-id from the incoming request or fields that header with a new id.
 */
export async function trace(
	req: Koa.Request,
	res: Koa.Response,
	next: Koa.Next,
) {
	const requestId = (req.headers["x-request-id"] as string) ?? randomUUID();

	res.set("x-request-id", randomUUID());

	return store.run(requestId, async () => {
		return next();
	});
}
