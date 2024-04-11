import Koa from "koa";
import { InternalServerError, isServerError } from "../../../../utils/errors";
import { logger } from "../../../../utils/logging";

/**
 * Centralized error handling middleware.
 */
export async function error(_: Koa.Request, res: Koa.Response, next: Koa.Next) {
	await next().catch((error) => {
		if (isServerError(error)) {
			return error.httpRespond(res);
		}
		logger.error(error);
		const err = new InternalServerError();
		return err.httpRespond(res);
	});
}
