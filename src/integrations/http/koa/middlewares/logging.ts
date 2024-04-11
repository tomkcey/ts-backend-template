import Koa from "koa";
import { config } from "../../../../utils/config";
import { logger } from "../../../../utils/logging";

/**
 * Middleware to log the incoming request and outgoing response with duration in milliseconds.
 */
export async function log(req: Koa.Request, res: Koa.Response, next: Koa.Next) {
	if (config.env === "test") {
		return next();
	}

	const s = new Date();
	logger.info(`${req.method} ${req.url}`);

	await next();

	const e = new Date();
	const logLevel = res.status >= 400 ? "error" : "info";
	logger[logLevel](
		`${req.method} ${req.url} ${res.status} ${e.getTime() - s.getTime()}ms`,
	);
}
