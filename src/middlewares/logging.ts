import Koa from "koa";
import { logger } from "../utils/logging";

export async function log(ctx: Koa.Context, next: Koa.Next) {
	const s = new Date();
	logger.info(`${ctx.method} ${ctx.url}`);

	await next();

	const e = new Date();
	const logLevel = ctx.status >= 400 ? "error" : "info";
	logger[logLevel](
		`${ctx.method} ${ctx.url} ${ctx.status} ${e.getTime() - s.getTime()}ms`,
	);
}
