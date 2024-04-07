import Koa from "koa";
import { config } from "../utils/config";
import { InternalServerError, TooManyRequestsError } from "../utils/errors";
import { Cache } from "../cache/cache";

type Count = [number, Date, Date | null];

enum ExecutorResult {
	Passthrough,
	Limited,
}

type Subscriber = (
	count: Count,
	counter: RateLimiter,
	key: string,
	now: Date,
) => Promise<boolean>;

/**
 * The cache parameter allows dependency injection. It handles sync and async operations.
 *
 * The subscribers parameter allows adding custom logic to the rate limiter.
 * It is an array of functions that take the count, the rate limiter instance, the key, and the current date as arguments.
 * It returns a promise that resolves to a boolean.
 * If the return value is true, the rate limiter will allow the request to pass.
 * If the return value is false, the rate limiter will block the request.
 *
 * @example
 * class CustomCache<T> implements Cache<T> {
 *		private cache: Record<string, T> = {};
 *
 *		async get(key: string): Promise<T | undefined> {
 *			return new Promise((resolve) => {
 *				return setTimeout(() => {
 *					return resolve(this.cache[key]);
 *				}, 250);
 *			});
 *		}
 *
 *		async set(key: string, value: T): Promise<Cache<T>> {
 *			return new Promise((resolve) => {
 *				return setTimeout(() => {
 *					this.cache[key] = value;
 *					return resolve(this);
 *				}, 250);
 *			});
 *		}
 *
 *		async clear(): Promise<void> {
 *			for (const key in this.cache) {
 *				await new Promise<void>((res) => {
 *					setTimeout(() => {
 *						delete this.cache[key];
 *						return res();
 *					}, 250);
 *				});
 *			}
 *		}
 *
 *		*keys(): IterableIterator<string> {
 *			for (const key in this.cache) {
 *				yield key;
 *			}
 *		}
 *}
 */
export class RateLimiter {
	constructor(
		protected cache: Cache<Count> = new Map<string, Count>(),
		protected subscribers: Subscriber[] = [],
	) {}

	public async middleware(ctx: Koa.Context, next: Koa.Next) {
		const result = await this.execute(ctx.ip);

		if (result === ExecutorResult.Passthrough) {
			return next();
		}

		if (result === ExecutorResult.Limited) {
			const error = new TooManyRequestsError();
			return error.httpRespond(ctx);
		}

		const error = new InternalServerError();
		return error.httpRespond(ctx);
	}

	public async get(ip: string): Promise<Count | undefined> {
		return this.cache.get(ip);
	}

	public async set(ip: string, count: Count): Promise<Cache<Count>> {
		return this.cache.set(ip, count);
	}

	public async clear(): Promise<void> {
		return this.cache.clear();
	}

	public subscribe(subscriber: Subscriber): RateLimiter {
		this.subscribers.push(subscriber);
		return this;
	}

	private async execute(ip: string): Promise<ExecutorResult> {
		const hit = await this.get(ip);

		const now = new Date();

		if (hit) {
			for (const subscriber of this.subscribers) {
				const canContinue = await subscriber(hit, this, ip, now);
				if (!canContinue) {
					return ExecutorResult.Limited;
				}
			}
		} else {
			await this.set(ip, [1, new Date(now.getTime() + 1000), null]);
		}

		return ExecutorResult.Passthrough;
	}
}

export const rateLimiter = new RateLimiter()
	.subscribe(async (count, counter, key, now) => {
		const [_, _rd, banDate] = count;
		if (banDate) {
			if (now >= banDate) {
				await counter.set(key, [
					1,
					new Date(now.getTime() + 1000),
					null,
				]);
				return true;
			}
			return false;
		}
		return true;
	})
	.subscribe(async (c, counter, key, now) => {
		const [count, renewDate, banDate] = c;
		if (now >= renewDate) {
			await counter.set(key, [
				1,
				new Date(now.getTime() + 1000),
				banDate,
			]);
			return true;
		}
		if (count < config.rateLimit.nReq) {
			await counter.set(key, [count + 1, renewDate, banDate]);
			return true;
		}
		return false;
	});
