import { createClient, RedisClientType } from "redis";
import { config } from "../../../utils/config";
import { Debugabble } from "../../../utils/debug";
import { randomHex } from "../../../utils/rand";

export class Cache extends Debugabble {
	protected client: RedisClientType | null = null;

	constructor(public id: string = randomHex()) {
		super();
	}

	private async getClient(): Promise<RedisClientType> {
		let client = this.client;
		if (!client) {
			client = createClient({ url: config.redis.url });
			client.on("error", (error) => {
				this.error(`Redis error: ${error}`);
			});

			this.client = await client.connect();
		}

		return client;
	}

	public async get(key: string): Promise<string | null> {
		const client = await this.getClient();
		return client.get(key);
	}

	public async set(
		key: string,
		value: string,
		expirationInSeconds?: number,
	): Promise<Cache> {
		const client = await this.getClient();
		await client.set(key, value, { EX: expirationInSeconds });
		return this;
	}

	public async clear(): Promise<void> {
		const client = await this.getClient();
		await client.flushDb();
	}

	public async *keys(): AsyncIterableIterator<string> {
		const client = await this.getClient();

		let cursor = 0;

		do {
			const result = await client.scan(cursor);
			cursor = result.cursor;
			for (const key of result.keys) {
				yield key;
			}
		} while (cursor !== 0);
	}

	public async disconnect() {
		const client = await this.getClient();
		await client.disconnect();
		this.client = null;
	}
}
