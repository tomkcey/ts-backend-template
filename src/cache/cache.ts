import { MaybePromise } from "../utils/async";

/**
 * Example implementations
 *
 * @example
 * class AsyncCache<T> implements Cache<T> {
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
 *
 * @example
 *
 * class SyncCache<T> implements Cache<T> {
 *	    private cache: Record<string, T> = {};
 *
 *	    get(key: string): T | undefined {
 *	    	return this.cache[key];
 *	    }
 *
 *	    set(key: string, value: T): Cache<T> {
 *	    	this.cache[key] = value;
 *	    	return this;
 *	    }
 *
 *	    clear(): void {
 *	    	for (const key in this.cache) {
 *	    		delete this.cache[key];
 *	    	}
 *	    }
 *
 *	    *keys(): IterableIterator<string> {
 *	    	for (const key in this.cache) {
 *	    		yield key;
 *	    	}
 *	    }
 *    }
 */
export interface Cache<T> {
	get(key: string): MaybePromise<T | undefined>;
	set(key: string, value: T, expiration?: number): MaybePromise<Cache<T>>;
	clear(): MaybePromise<void>;
	keys(): IterableIterator<string> | AsyncIterableIterator<string>;
}
