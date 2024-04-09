import { MaybePromise } from "../../utils/async";

export interface Cache<T> {
	get(key: string): MaybePromise<T | undefined>;
	set(
		key: string,
		value: T,
		expirationInSeconds?: number,
	): MaybePromise<Cache<T>>;
	clear(): MaybePromise<void>;
	keys(): IterableIterator<string> | AsyncIterableIterator<string>;
}
