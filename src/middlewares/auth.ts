import Koa from "koa";
import { config } from "../utils/config";
import { UnauthorizedError } from "../utils/errors";

/**
 * Middleware to authenticate the request.
 * The authentication scheme is a simpe API key that the server knows and the client must have.
 * Currently vulnerable to timing attacks.
 */
export async function auth(ctx: Koa.Context, next: Koa.Next) {
	const rcvd = ctx.headers["x-api-key"];
	if (rcvd === undefined || rcvd !== config.apiKey) {
		const error = new UnauthorizedError();
		return error.httpRespond(ctx);
	}

	await next();
}
