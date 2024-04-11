import { trace } from "./middlewares/tracing";
import { log } from "./middlewares/logging";
import { RateLimiter } from "./middlewares/limiting";
import { auth } from "./middlewares/auth";
import { error } from "./middlewares/errors";
import { KoaHttp } from "./integrations/http";
import { constants } from "http2";

export async function bootstrap(limiter: RateLimiter) {
	const http = KoaHttp.getKoaHttpServer();

	http.middleware(trace)
		.middleware(log)
		.middleware(error)
		.middleware(auth)
		.middleware(async (req, res, next) =>
			limiter.middleware(req, res, next),
		)
		.createController("/ping", "get", async (_, res) => {
			res.status = constants.HTTP_STATUS_NO_CONTENT;
			return res;
		})
		.createController("/v1", "get", async (_, res) => {
			res.status = constants.HTTP_STATUS_OK;
			res.body = "Hello World";
			return res;
		});

	return http;
}
