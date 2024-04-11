import Koa from "koa";
import { config } from "../utils/config";
import { UnauthorizedError } from "../utils/errors";

const API_KEY_HEADER_KEY = "x-api-key";

/**
 * Middleware to authorize the request.
 *
 * The server knows the secret and must distribute it to clients in order for them to make authorized calls.
 *
 * **NOTE**: Currently vulnerable to timing attacks.
 */
export async function auth(req: Koa.Request, _: Koa.Response, next: Koa.Next) {
	const rcvd = req.headers[API_KEY_HEADER_KEY];
	if (rcvd === undefined || rcvd !== config.apiKey) {
		throw new UnauthorizedError();
	}

	await next();
}
