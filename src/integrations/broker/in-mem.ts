import { Writable } from "stream";
import { isNil, isNotNil } from "../../utils/coersion";
import { logger } from "../../utils/logging";
import { randomHex } from "../../utils/rand";
import { ConnectionManager } from "./interfaces";
import { LinkedList } from "../../utils/list";

export class Consumer extends Writable {
	constructor(
		private fn: (chunk: Buffer) => void = () => {},
		public id: string = randomHex(),
	) {
		super({ autoDestroy: false });
	}

	_write(
		chunk: Buffer,
		_encoding: BufferEncoding,
		callback: (error?: Error | null | undefined) => void,
	): void {
		logger.debug(`${Consumer.name} [${this.id}] received data.`);
		this.fn(chunk);
		callback();
	}
}

export class Queue {
	protected list = new LinkedList<Buffer>();
	protected consumers = new Map<string, Consumer>();

	constructor(public name: string) {}

	public get length(): number {
		const size = this.list.size;
		logger.debug(`${Queue.name} queue size is ${size}.`);
		return size;
	}

	protected broadcast(value: Buffer) {
		for (const c of this.consumers.values()) {
			c.write(value);
		}
	}

	public enqueue(value: Buffer): void {
		if (this.consumers.size === 0) {
			logger.debug(
				`${Queue.name} has no consumers, placing new message in the queue.`,
			);
			this.list.push(value);
			return;
		}

		logger.debug(`${Queue.name} broadcasting new message.`);
		this.broadcast(value);
	}

	public dequeue(): Buffer | undefined {
		return this.list.pop()?.value;
	}

	public subscribe(c: Consumer): () => void {
		logger.debug(`${Queue.name} subscribing consumer [${c.id}].`);
		this.consumers.set(c.id, c);

		const s = new AbortController();

		new Promise<void>(async (resolve) => {
			for await (const buf of this.list) {
				if (s.signal.aborted) {
					logger.debug(
						`${Queue.name} consumer [${c.id}] aborted consuming the queue.`,
					);

					break;
				}

				if (isNotNil(buf)) {
					this.broadcast(buf);
				}
			}

			if (!s.signal.aborted) {
				logger.debug(
					`${Queue.name} consumer [${c.id}] consumed the queue.`,
				);
			}

			resolve();
		});

		return () => {
			logger.debug(`${Queue.name} unsubscribing consumer [${c.id}].`);
			this.consumers.delete(c.id);
			if (this.length > 0) {
				s.abort();
			}
		};
	}
}

export class Broker implements ConnectionManager<Queue> {
	private queues = new Map<string, Queue>();

	public connect(queueName: string): Queue {
		const maybeQueue = this.queues.get(queueName);
		if (isNotNil(maybeQueue)) {
			return maybeQueue;
		}

		const queue = new Queue(queueName);
		this.queues.set(queueName, queue);

		logger.debug(`${Broker.name} created queue '${queueName}'.`);

		return queue;
	}

	public close(queueName: string): void {
		const queue = this.queues.get(queueName);

		if (isNotNil(queue)) {
			this.queues.delete(queueName);
			logger.debug(`${Broker.name} closed queue '${queueName}'.`);
		}
	}

	public closeAll(): void {
		this.queues.clear();
		logger.debug(`${Broker.name} closed all queues.`);
	}

	public send(queueName: string, message: Buffer): void {
		let queue = this.queues.get(queueName);

		if (isNil(queue)) {
			queue = this.connect(queueName);
		}

		queue.enqueue(message);
	}

	public receive(
		queueName: string,
		consumer?: Consumer | ((chunk: Buffer) => void),
	): { consumer: Consumer; unsubscribe: () => void } {
		const c = (() => {
			if (consumer instanceof Consumer) {
				return consumer;
			}

			if (typeof consumer === "function") {
				return new Consumer(consumer);
			}

			throw new Error("Invalid 'consumer' parameter.");
		})();

		let queue = this.queues.get(queueName);

		if (isNil(queue)) {
			queue = this.connect(queueName);
		}

		const unsubscribe = queue.subscribe(c);

		return { consumer: c, unsubscribe };
	}
}
