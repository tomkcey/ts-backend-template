import Koa from "koa";
import { InternalServerError, isServerError } from "../utils/errors";
import { logger } from "../utils/logging";

/**
 * Centralized error handling middleware.
 */
export async function error(ctx: Koa.Context, next: Koa.Next) {
	await next().catch((error) => {
		if (isServerError(error)) {
			return error.httpRespond(ctx);
		}
		logger.error(error);
		const err = new InternalServerError();
		return err.httpRespond(ctx);
	});
}
