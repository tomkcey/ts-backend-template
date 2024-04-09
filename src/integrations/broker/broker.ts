import { MaybePromise } from "../../utils/async";

export interface Broker<T, U> {
	connect(options?: U): MaybePromise<T>;
	disconnect(): MaybePromise<void>;
}

export abstract class Consumer<T, U> {
	protected connection: U;
	protected queue: Broker.Queue;
	protected fn: (message: T) => MaybePromise<void>;

	constructor(
		connection: U,
		queue: Broker.Queue,
		fn: (message: T) => MaybePromise<void>,
	) {
		this.connection = connection;
		this.queue = queue;
		this.fn = fn;
	}

	public abstract consume(): MaybePromise<void>;
}

export abstract class Producer<T, U> {
	protected connection: U;
	protected queue: Broker.Queue;

	constructor(connection: U, queue: Broker.Queue) {
		this.connection = connection;
		this.queue = queue;
	}

	public abstract send(message: T): MaybePromise<void>;
}

export namespace Broker {
	export const QUEUES = ["general"] as const;

	export type Queue = (typeof QUEUES)[number];
}
