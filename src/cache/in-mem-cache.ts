import { Cache } from "./cache";

class InMemoryCache implements Cache<number> {
	private cache: Map<string, number> = new Map();

	public async get(key: string): Promise<number | undefined> {
		return this.cache.get(key);
	}

	public async set(
		key: string,
		value: number,
		expirationInSeconds?: number,
	): Promise<Cache<number>> {
		this.cache.set(key, value);
		if (expirationInSeconds) {
			setTimeout(() => {
				this.cache.delete(key);
			}, expirationInSeconds * 1000);
		}
		return this;
	}

	public async clear(): Promise<void> {
		this.cache.clear();
	}

	public *keys(): IterableIterator<string> {
		for (const key of this.cache.keys()) {
			yield key;
		}
	}
}

export const inMemoryCache = new InMemoryCache();
