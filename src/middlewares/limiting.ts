import Koa from "koa";
import { config } from "../utils/config";
import { InternalServerError, TooManyRequestsError } from "../utils/errors";
import { Cache } from "../integrations/cache/cache";

enum ExecutorResult {
	Passthrough,
	Limited,
}

type Subscriber<T, U = RateLimiter> = (
	count: T,
	executor: U,
	key: string,
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
		protected cache: Cache<number> = new Map<string, number>(),
		protected subscribers: Subscriber<number, RateLimiter>[] = [],
	) {}

	public async middleware(req: Koa.Request, _: Koa.Response, next: Koa.Next) {
		const result = await this.execute(req.ip);

		if (result === ExecutorResult.Passthrough) {
			return next();
		}

		if (result === ExecutorResult.Limited) {
			throw new TooManyRequestsError();
		}

		throw new InternalServerError();
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

	public subscribe(subscriber: Subscriber<number, RateLimiter>): this {
		this.subscribers.push(subscriber);
		return this;
	}

	private async execute(ip: string): Promise<ExecutorResult> {
		const hit = await this.get(ip);

		if (hit) {
			for (const subscriber of this.subscribers) {
				const canContinue = await subscriber(hit, this, ip);
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

export namespace RateLimiter {
	const store = new Set<string>();
	let limiter: RateLimiter | null = null;

	export function cleanup() {
		limiter = null;
	}

	export function withCache(cache: Cache<number>): RateLimiter {
		if (limiter) {
			return limiter;
		}

		limiter = new RateLimiter(cache)
			.subscribe(async (_c, _e, key) => !store.has(key))
			.subscribe(async (count, executor, key) => {
				if (count < config.rateLimit.nReq) {
					await executor.set(
						key,
						count + 1,
						config.rateLimit.durationInMs / 1000,
					);
					return true;
				}
				store.add(key);
				setTimeout(() => {
					store.delete(key);
				}, config.rateLimit.durationInMs);
				return false;
			});

		return limiter;
	}
}
