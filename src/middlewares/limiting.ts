import Koa from "koa";
import { config } from "../utils/config";
import { TooManyRequestsError } from "../utils/errors";

type Item = [number, NodeJS.Timeout | null, NodeJS.Timeout | null];

export class Limiter {
	protected cache: Map<string, Item> = new Map();

	public async run(ctx: Koa.Context, next: Koa.Next) {
		const cacheHit = this.cache.get(ctx.ip);

		if (cacheHit) {
			const [count, timer, banTimer] = cacheHit;

			if (count < config.rateLimit.nReq) {
				this.cache.set(ctx.ip, [count + 1, timer, banTimer]);
				return next();
			}

			const newBanTimer = setTimeout(() => {
				if (timer) clearTimeout(timer);
				if (banTimer) clearTimeout(banTimer);

				this.cache.delete(ctx.ip);
			}, config.rateLimit.duration);

			this.cache.set(ctx.ip, [count, timer, newBanTimer]);

			const error = new TooManyRequestsError();
			return error.httpRespond(ctx);
		}

		const newTimer = setTimeout(() => {
			const cacheHit = this.cache.get(ctx.ip);
			if (!cacheHit) {
				return;
			}

			const [_, timer, banTimer] = cacheHit;

			if (timer) clearTimeout(timer);
			if (banTimer) clearTimeout(banTimer);

			this.cache.delete(ctx.ip);
		}, config.rateLimit.duration);

		this.cache.set(ctx.ip, [1, newTimer, null]);

		await next();
	}

	public async clear() {
		for (const [_, timer, banTimer] of this.cache.values()) {
			if (timer) {
				clearTimeout(timer);
			}

			if (banTimer) {
				clearTimeout(banTimer);
			}
		}

		this.cache.clear();
	}
}

export const limiter = new Limiter();
