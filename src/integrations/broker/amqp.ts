import { Connection, ConsumeMessage, Options, Replies, connect } from "amqplib";
import { randomHex } from "../../utils/rand";
import { config } from "../../utils/config";
import { logger } from "../../utils/logging";
import { isNotNil } from "../../utils/coersion";
import { ConnectionManager } from "./interfaces";

export class Manager implements ConnectionManager<Connection> {
	constructor(
		private url: string = config.amqp.url,
		private options: Options.Connect = {},
		private map: Map<string, Connection> = new Map(),
	) {}

	public async connect(id: string = randomHex(3)) {
		logger.debug(`${Manager.name} connecting ${id}.`);

		const maybeConnection = this.map.get(id);
		if (maybeConnection) {
			logger.debug(`${Manager.name} yielding existing connection ${id}.`);
			return maybeConnection;
		}

		const c = await connect(this.url, this.options);

		c.on("error", (error) => {
			logger.error(
				`${Manager.name} connection ${id} error: ${JSON.stringify(error)}`,
			);
		});

		logger.debug(`${Manager.name} setting reference for connection ${id}.`);
		this.map.set(id, c);

		return c;
	}

	public async close(id: string) {
		const connection = this.map.get(id);
		if (connection) {
			logger.debug(
				`${Manager.name} closing connection ${id} and removing reference.`,
			);

			await connection.close();
			this.map.delete(id);

			logger.info(
				`${Manager.name} closed connection ${id} and removed reference.`,
			);
		}
	}

	public async closeAll() {
		for (const [id, connection] of this.map.entries()) {
			logger.debug(`${Manager.name} closing connection ${id}.`);

			await connection.close();

			logger.info(`${Manager.name} connection ${id} closed.`);
		}

		logger.debug(`${Manager.name} removing all connection references.`);

		this.map.clear();

		logger.info(`${Manager.name} removed connection references.`);
	}
}

export class Operator {
	constructor(
		protected mngr: Manager,
		public id: string,
	) {}

	public async queue(queue: string, oq: Options.AssertQueue = {}) {
		logger.debug(
			`${this.constructor.name} creating/reusing queue ${queue}.`,
		);

		const c = await this.mngr.connect(this.id);
		const ch = await c.createChannel();

		await ch.assertQueue(queue, oq);
		logger.info(`${this.constructor.name} created/reused queue ${queue}.`);

		return ch;
	}

	public async read(queue: string) {
		logger.debug(`${this.constructor.name} reading queue ${queue}.`);

		const id = randomHex(3);

		const c = await this.mngr.connect(id);
		const ch = await c.createChannel();

		const result = await ch.checkQueue(queue).catch((error) => {
			logger.error(
				`${this.constructor.name} error reading queue ${queue}: ${JSON.stringify(error)}`,
			);
			return { queue, messageCount: 0, consumerCount: 0 };
		});
		logger.info(`${this.constructor.name} read queue ${queue}.`);

		await this.mngr.close(id);

		return result;
	}

	public async empty(queue: string) {
		logger.debug(`${this.constructor.name} emptying queue ${queue}.`);

		const id = randomHex(3);

		const c = await this.mngr.connect(id);
		const ch = await c.createChannel();

		const result = await ch
			.purgeQueue(queue)
			.then((r) => {
				logger.info(`${this.constructor.name} emptied queue ${queue}.`);
				return r;
			})
			.catch((error) => {
				logger.error(
					`${this.constructor.name} error purging queue ${queue}: ${JSON.stringify(error)}`,
				);
				return { messageCount: 0 } as Replies.PurgeQueue;
			});

		await this.mngr.close(id);

		return result;
	}

	public async shutdown() {
		return this.mngr.close(this.id);
	}
}

export class Sender extends Operator {
	constructor(mngr: Manager, id: string = randomHex(3)) {
		super(mngr, id);
	}

	public async send(
		b: Buffer,
		oq: Options.AssertQueue & { queue: string },
		op: Options.Publish = {},
	) {
		const ch = await this.queue(oq.queue, oq);

		logger.debug(`${Sender.name} sending message to queue ${oq.queue}.`);

		const ct = ch.sendToQueue(oq.queue, b, op);
		if (!ct) {
			logger.warn(
				`${Sender.name} queue ${oq.queue} is full. Waiting for 'drain' event.`,
			);

			// Ponder: Should we deal with this in a promise?
			ch.once("drain", () => {
				ch.sendToQueue(oq.queue, b, op);
				logger.info(
					`${Sender.name} sent message to queue ${oq.queue}.`,
				);
				ch.close();
			});

			return;
		}

		await ch.close();
		logger.info(`${Sender.name} sent message to queue ${oq.queue}.`);
	}
}

export class Receiver extends Operator {
	constructor(mngr: Manager, id: string = randomHex(3)) {
		super(mngr, id);
	}

	public async receive(
		fn: (message: ConsumeMessage | null) => Promise<void>,
		oq: Options.AssertQueue & { queue: string },
		oc: Options.Consume = {},
	) {
		const ch = await this.queue(oq.queue, oq);

		await ch.prefetch(1);

		logger.debug(
			`${Receiver.name} receiving messages on queue ${oq.queue}.`,
		);

		ch.consume(
			oq.queue,
			async (msg) => {
				logger.debug(
					`${Receiver.name} received a message on queue ${oq.queue}.`,
				);
				if (isNotNil(msg)) {
					await fn(msg).catch((error) => {
						logger.error(
							`${Receiver.name} error receiving message: ${JSON.stringify(error)}`,
						);

						return ch.nack(msg, false, false);
					});

					ch.ack(msg, false);

					logger.info(
						`${Receiver.name} handled a message on queue ${oq.queue}.`,
					);
				}
			},
			oc,
		);
	}
}

abstract class Relay {
	constructor(
		protected mngr: Manager,
		public id: string,
		public queue: string,
	) {}

	public abstract shutdown(): Promise<void>;
}

class SenderRelay extends Relay {
	protected rcvr: Receiver;

	constructor(mngr: Manager, id: string, queue: string) {
		super(mngr, id, queue);

		this.rcvr = new Receiver(mngr, id);
	}

	public async receive(
		fn: (message: ConsumeMessage | null) => Promise<void>,
	) {
		return new Promise<void>((resolve) => {
			logger.debug(
				`${SenderRelay.name} binding receiver ${this.rcvr.id} on queue ${this.queue}.`,
			);

			this.rcvr.receive(
				async (msg) => {
					if (!msg) {
						return;
					}

					await fn(msg);
					logger.info(
						`${SenderRelay.name} handled message on queue ${this.queue}.`,
					);
					resolve();
				},
				{ queue: this.queue },
				{ noAck: false },
			);
		});
	}

	public async shutdown() {
		await this.rcvr.shutdown();
	}
}

class ReceiverRelay extends Relay {
	protected sndr: Sender;

	constructor(mngr: Manager, id: string, queue: string) {
		super(mngr, id, queue);

		this.sndr = new Sender(mngr, id);
	}

	public async send(b: Buffer, headers: Record<string, string>) {
		logger.debug(
			`${ReceiverRelay.name} binding sender ${this.sndr.id} on queue ${this.queue}.`,
		);

		await this.sndr.send(b, { queue: this.queue }, { headers });

		logger.info(
			`${ReceiverRelay.name} sent message on queue ${this.queue}.`,
		);
	}

	public async shutdown() {
		await this.sndr.shutdown();
	}
}

export async function sendAndReceive(
	b: Buffer,
	fn: (message: ConsumeMessage | null) => Promise<Buffer>,
	queue: string,
) {
	// Prepare resources
	const mngr = new Manager();

	const tmpQueue = "tmp" + "-" + queue + "-" + randomHex(3);

	const sndr = new Sender(mngr);
	const sndrRelay = new SenderRelay(mngr, randomHex(3), tmpQueue); // tmp queue consumer
	const rcvr = new Receiver(mngr);
	const rcvrRelay = new ReceiverRelay(mngr, randomHex(3), tmpQueue); // tmp queue publisher

	// Execute flow
	const result = await new Promise<Buffer>(async (resolve) => {
		void sndrRelay.receive(async (msg) => {
			logger.debug(
				`${sendAndReceive.name} temporary consumer (${SenderRelay.name}) received message.`,
			);

			const r = await fn(msg);
			resolve(r);
		});

		void rcvr.receive(
			async (msg) => {
				logger.debug(
					`${sendAndReceive.name} consumer (${SenderRelay.name}) received message.`,
				);

				if (isNotNil(msg)) {
					return rcvrRelay.send(msg.content, {
						["x-replied-from-queue"]: queue,
					});
				}
			},
			{ queue, durable: true },
			{ noAck: false },
		);

		await sndr.send(b, { queue, durable: true }, { replyTo: tmpQueue });
	});

	await mngr.closeAll();

	return result;
}

export async function send(
	b: Buffer,
	oq: Options.AssertQueue & { queue: string },
	op: Options.Publish = {},
	mngr: Manager = new Manager(),
) {
	const sndr = new Sender(mngr);
	await sndr.send(b, oq, op);
	await sndr.shutdown();
}

export function receive(
	fn: (message: ConsumeMessage | null) => Promise<void>,
	oq: Options.AssertQueue & { queue: string },
	oc: Options.Consume = {},
	mngr: Manager = new Manager(),
) {
	const rcvr = new Receiver(mngr);
	rcvr.receive(fn, oq, { noAck: false, ...oc });
	return rcvr;
}
