import { Channel, Connection, ConsumeMessage, Options, connect } from "amqplib";
import { Debugabble } from "../../../utils/debug";
import { config } from "../../../utils/config";
import { isNil, isNotNil } from "../../../utils/coersion";
import { randomHex } from "../../../utils/rand";

export class Manager extends Debugabble {
	private connection: Connection | null = null;

	constructor(
		private url: string = config.amqp.url,
		public id: string = randomHex(),
	) {
		super();
	}

	public async connect(): Promise<Connection> {
		if (isNotNil(this.connection)) {
			this.debug(
				"Connection already exists. Reusing existing connection.",
			);
			return this.connection;
		}

		this.debug("Connection does not exist. Creating new connection.");
		this.connection = await connect(this.url);

		this.connection.on("error", (error) => {
			this.error(`Connection error.\n${JSON.stringify(error)}\n`);
		});

		return this.connection;
	}

	public async close(): Promise<void> {
		if (isNotNil(this.connection)) {
			this.debug("Closing connection.");
			await this.connection.close();
			this.connection = null;
		}
	}

	public async createChannel(): Promise<Channel> {
		const connection = await this.connect();
		this.debug("Creating new channel.");
		const ch = await connection.createChannel();

		ch.on("error", (error) => {
			this.error(`Channel error.\n${JSON.stringify(error)}\n`);
		});

		return ch;
	}
}

export class Executor extends Debugabble {
	public channel: Channel | null = null;
	protected queues: Set<string> = new Set();
	protected consumers: Set<string> = new Set();

	constructor(
		private mngr: Manager,
		public id: string = randomHex(),
	) {
		super();
	}

	public async getChannel(): Promise<Channel> {
		let channel = this.channel;
		if (isNil(this.channel)) {
			this.debug("Channel does not exist. Creating new channel.");
			channel = await this.mngr.createChannel();
			this.channel = channel;
			return channel;
		}

		this.debug("Channel already exists. Reusing existing channel.");
		return this.channel;
	}

	public async getQueue(
		queue: string,
		options?: Options.AssertQueue,
	): Promise<Channel> {
		const ch = await this.getChannel();
		if (this.queues.has(queue)) {
			return ch;
		}

		this.debug(`Asserting queue '${queue}'`);
		await ch.assertQueue(queue, options);
		this.queues.add(queue);
		return ch;
	}

	public async close(): Promise<void> {
		if (isNotNil(this.channel)) {
			this.debug("Closing channel.");
			await this.channel.close();
			this.channel = null;

			for (const id of this.consumers) {
				this.warn(`Consumer with id ${id} will become unresponsive.`);
			}
		}
	}

	public subscribeConsumer(id: string): void {
		if (!this.consumers.has(id)) {
			this.debug(`Subscribing consumer with id ${id}`);
			this.consumers.add(id);
		}
	}

	public unsubscribeConsumer(id: string): void {
		if (this.consumers.has(id)) {
			this.debug(`Unsubscribing consumer with id ${id}`);
			this.consumers.delete(id);
		}
	}
}

abstract class Operator extends Debugabble {
	protected abstract executor: Executor;
	public abstract id: string;

	public async close(): Promise<void> {
		await this.executor.close();
	}
}

export class Producer extends Operator {
	constructor(
		protected executor: Executor,
		public id: string = randomHex(),
	) {
		super();
	}

	public async send(
		queue: string,
		buffer: Buffer,
		options?: Options.Publish,
		qOptions?: Options.AssertQueue,
	): Promise<void> {
		const ch = await this.executor.getQueue(queue, qOptions);

		this.debug(`Sending message to queue '${queue}'`);

		const ct = ch.sendToQueue(queue, buffer, options);

		if (!ct) {
			this.debug("Cannot push message to queue. Backpressure detected.");

			return new Promise((resolve) => {
				ch.once("drain", () => {
					this.debug(
						"Drain event emitted. Retrying to push message to queue.",
					);

					this.send(queue, buffer, options).then(() => resolve());
				});
			});
		}
	}

	public async sendAndReceive<T>(
		queue: string,
		buffer: Buffer,
		fn: (msg: ConsumeMessage | null) => Promise<T>,
		options?: Options.Publish,
		qOptions?: Options.AssertQueue,
	) {
		const tmpQueue = "tmp" + "-" + queue + "-" + randomHex();

		const tmpRcvr = new Consumer(this.executor);

		const result = await new Promise<T>(async (resolve) => {
			await tmpRcvr.consume(
				tmpQueue,
				async (msg) => {
					if (isNotNil(msg)) {
						const r = await fn(msg);
						resolve(r);
					}
				},
				{ noAck: false },
				{ autoDelete: true },
			);

			await this.send(
				queue,
				buffer,
				{ ...options, replyTo: tmpQueue },
				qOptions,
			);
		});

		this.executor.unsubscribeConsumer(tmpRcvr.id);

		return result;
	}
}

export class Consumer extends Operator {
	constructor(
		protected executor: Executor,
		public id: string = randomHex(),
	) {
		super();
	}

	public async consume<T>(
		queue: string,
		fn: (msg: ConsumeMessage | null) => Promise<T>,
		options?: Options.Consume,
		qOptions?: Options.AssertQueue,
	): Promise<void> {
		const ch = await this.executor.getQueue(queue, qOptions);
		await ch.prefetch(1);

		ch.consume(
			queue,
			async (msg) => {
				if (isNotNil(msg)) {
					try {
						const result = await fn(msg);

						if (isNotNil(msg.properties.replyTo)) {
							const bufferedResult = this.toMaybeBuffer(result);
							if (isNil(bufferedResult)) {
								throw new Error(
									"Result is nil. Cannot send nil result to target reply queue.",
								);
							}

							const sndr = new Producer(this.executor);
							await sndr.send(
								msg.properties.replyTo,
								bufferedResult,
								{
									correlationId: msg.properties.correlationId,
									headers: {
										["x-replied-from"]: queue,
									},
								},
								{ autoDelete: true },
							);
						}

						ch.ack(msg, false);
					} catch (error) {
						this.error(
							`Error occured while handling message.\n\n${JSON.stringify(error)}\n\n${JSON.stringify(msg)}\n`,
						);

						return ch.nack(msg, false, false);
					}
				}
			},
			options,
		);

		this.executor.subscribeConsumer(this.id);
	}

	protected toMaybeBuffer(x: unknown): Buffer | null {
		if (isNil(x)) {
			return null;
		}

		if (x instanceof Buffer) {
			return x;
		}

		if (typeof x === "string") {
			return Buffer.from(x);
		}

		return Buffer.from(JSON.stringify(x));
	}
}
