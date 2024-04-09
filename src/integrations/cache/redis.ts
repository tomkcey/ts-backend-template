import { createClient, RedisClientType } from "redis";
import { Cache } from "./cache";
import { logger } from "../../utils/logging";
import { config } from "../../utils/config";

export class RedisCache implements Cache<number> {
	constructor(protected client: RedisClientType) {
		client.on("error", (err) => {
			logger.error(JSON.stringify(err));
		});
	}

	public async get(key: string): Promise<number | undefined> {
		return this.client
			.get(key)
			.then((v) => (v ? parseInt(v, 10) : undefined));
	}

	public async set(
		key: string,
		value: number,
		expirationInSeconds?: number,
	): Promise<Cache<number>> {
		await this.client.set(key, value, { EX: expirationInSeconds });
		return this;
	}

	public async clear(): Promise<void> {
		await this.client.flushDb();
	}

	public async *keys(): AsyncIterableIterator<string> {
		let cursor = 0;
		do {
			const result = await this.client.scan(cursor);
			cursor = result.cursor;
			for (const key of result.keys) {
				yield key;
			}
		} while (cursor !== 0);
	}

	public async disconnect() {
		await this.client.disconnect();
	}
}

export namespace RedisCache {
	let cache: RedisCache | null = null;

	export async function cleanup() {
		if (cache) {
			await cache.disconnect();
			cache = null;
		}
	}

	export async function getCache() {
		if (!cache) {
			const client: RedisClientType = createClient({
				url: config.redis.url,
			});
			await client.connect();
			cache = new RedisCache(client);
		}

		return cache;
	}
}
