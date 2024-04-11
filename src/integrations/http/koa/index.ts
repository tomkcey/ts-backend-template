export { KoaHttp } from "./koa";
import { RateLimiter, auth, error, log, trace } from "./middlewares";

export const middlewares = {
	RateLimiter,
	auth,
	error,
	log,
	trace,
};
