import Koa from "koa";
import { config } from "../utils/config";
import { InternalServerError, TooManyRequestsError } from "../utils/errors";
import { Cache } from "../cache/cache";
import { inMemoryCache } from "../cache/in-mem-cache";
import { getRedisCache } from "../cache/redis";
import { logger } from "../utils/logging";

type Count = [number, Date, Date | null];

enum ExecutorResult {
	Passthrough,
	Limited,
}

type Subscriber<T = Count, U = RateLimiter> = (
	count: T,
	counter: U,
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

	public async set(
		ip: string,
		count: Count,
		expiration?: number,
	): Promise<Cache<Count>> {
		return this.cache.set(ip, count, expiration);
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

/**
 * NEW
 */

export class Limiter {
	constructor(
		protected cache: Cache<number> = new Map<string, number>(),
		protected subscribers: Subscriber<number, Limiter>[] = [],
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

	public async get(ip: string): Promise<number | undefined> {
		return this.cache.get(ip);
	}

	public async set(
		ip: string,
		count: number,
		expirationInSeconds?: number,
	): Promise<Cache<number>> {
		return this.cache.set(ip, count, expirationInSeconds);
	}

	public async clear(): Promise<void> {
		return this.cache.clear();
	}

	public subscribe(subscriber: Subscriber<number, Limiter>): this {
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
			await this.set(ip, 1, config.rateLimit.durationInMs / 1000);
		}

		return ExecutorResult.Passthrough;
	}
}

const inMemoryRateLimiterMap = new Map<string, true>();
let inMemoryRateLimiter: Limiter | null = null;

function cleanupInMemoryRateLimiter() {
	inMemoryRateLimiter = null;
}

export async function getInMemoryRateLimiter() {
	if (inMemoryRateLimiter) {
		return { inMemoryRateLimiter, cleanupInMemoryRateLimiter };
	}

	inMemoryRateLimiter = new Limiter(inMemoryCache)
		.subscribe(async (_c, _e, key, _n) => {
			if (inMemoryRateLimiterMap.get(key)) {
				return false;
			}
			return true;
		})
		.subscribe(async (count, executor, key, now) => {
			if (count < config.rateLimit.nReq) {
				await executor.set(
					key,
					count + 1,
					config.rateLimit.durationInMs / 1000,
				);
				return true;
			}
			inMemoryRateLimiterMap.set(key, true);
			setTimeout(() => {
				inMemoryRateLimiterMap.delete(key);
			}, config.rateLimit.durationInMs);
			return false;
		});

	return { inMemoryRateLimiter, cleanupInMemoryRateLimiter };
}

const redisRateLimiterMap = new Map<string, true>();
let redisRateLimiter: Limiter | null = null;

function cleanupRedisRateLimiter() {
	redisRateLimiter = null;
}

export async function getRedisRateLimiter() {
	if (redisRateLimiter) {
		return { redisRateLimiter, cleanupRedisRateLimiter };
	}

	const { redisCache } = await getRedisCache();

	redisRateLimiter = new Limiter(redisCache)
		.subscribe(async (_c, _e, key, _n) => {
			if (redisRateLimiterMap.get(key)) {
				return false;
			}
			return true;
		})
		.subscribe(async (count, executor, key, now) => {
			if (count < config.rateLimit.nReq) {
				await executor.set(
					key,
					count + 1,
					config.rateLimit.durationInMs / 1000,
				);
				return true;
			}
			redisRateLimiterMap.set(key, true);
			setTimeout(() => {
				redisRateLimiterMap.delete(key);
			}, config.rateLimit.durationInMs);
			return false;
		});

	return { redisRateLimiter, cleanupRedisRateLimiter };
}
