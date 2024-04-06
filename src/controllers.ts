import Koa from "koa";

/**
 * Factory function to create controllers.
 * Useful for wrapping or injecting dependencies into your controllers.
 */
export function createController(
	controller: (ctx: Koa.Context) => Promise<Koa.Context>,
) {
	return controller;
}
