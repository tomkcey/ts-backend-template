import Koa from "koa";

export function createController(
	controller: (ctx: Koa.Context) => Promise<Koa.Context>,
) {
	return controller;
}
