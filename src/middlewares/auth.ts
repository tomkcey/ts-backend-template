import Koa from "koa";
import { config } from "../utils/config";
import { UnauthorizedError } from "../utils/errors";

export async function auth(ctx: Koa.Context, next: Koa.Next) {
	const rcvd = ctx.headers["x-api-key"];
	if (rcvd === undefined || rcvd !== config.apiKey) {
		const error = new UnauthorizedError();
		return error.httpRespond(ctx);
	}

	await next();
}
