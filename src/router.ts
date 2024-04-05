import KoaRouter from "koa-router";
import { createController } from "./controllers";
import { constants } from "http2";

export const router = new KoaRouter();

router.get("/ping", async (ctx) => {
	ctx.status = constants.HTTP_STATUS_NO_CONTENT;
	return ctx;
});

const v1 = new KoaRouter();

v1.get(
	"/",
	createController(async (ctx) => {
		ctx.status = constants.HTTP_STATUS_OK;
		ctx.body = "Hello World";
		return ctx;
	}),
);

router.use("/v1", v1.routes());
