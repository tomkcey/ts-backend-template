import { MaybePromise } from "../../utils/async";

/**
 * `ConnectionManager` is an interface for managing connections.
 *
 * The `id` parameter is mandatory and used by the implementer to identify the connection; useful for closing the connection cleanly after use.
 *
 * The generic parameter `T` is the type of the connection.
 */
export interface ConnectionManager<T> {
	connect(id: string): MaybePromise<T>;

	close(id: string): MaybePromise<void>;

	closeAll(): MaybePromise<void>;
}

export type Options<T> = T extends { [K in keyof T]: T[K] } ? T : never;

export interface OperationExecutor<T> {
	send<U, V>(
		queue: string,
		message: T,
		op?: Options<U>,
		oq?: Options<V>,
	): MaybePromise<void>;

	receive<U, V>(
		queue: string,
		fn: (message: T) => MaybePromise<void>,
		op?: Options<U>,
		oq?: Options<V>,
	): MaybePromise<string>;

	sendAndReceive(
		queue: string,
		message: T,
		fn: (message: T) => MaybePromise<Buffer>,
	): MaybePromise<Buffer>;
}
