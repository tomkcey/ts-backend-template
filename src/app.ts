import Koa from "koa";
import { config } from "./utils/config";
import { trace } from "./middlewares/tracing";
import { log } from "./middlewares/logging";
import { limiter } from "./middlewares/limiting";
import { auth } from "./middlewares/auth";
import { router } from "./router";
import { error } from "./middlewares/errors";

export const app = new Koa({ env: config.env });

app.use(trace)
	.use(log)
	.use(auth)
	.use(error)
	.use(async (ctx, next) => limiter.run(ctx, next))
	.use(router.routes());
