import { config } from "../utils/config";
import { logger } from "../utils/logging";
import { Broker, Consumer, Producer } from "./broker";
import { Connection, ConsumeMessage, Options, connect } from "amqplib";

/**
 * Use the `Amqp.getBroker()` function to get an instance of the Amqp class.
 */
export class Amqp implements Broker<Connection, Amqp.Options> {
	public async connect(options: Amqp.Options): Promise<Connection> {
		return connect(options.url).catch((error) => {
			logger.error(JSON.stringify(error));
			throw error;
		});
	}

	public async disconnect() {
		await Amqp.disconnect();
	}
}

class AmqpProducer extends Producer<Buffer, Connection> {
	constructor(connection: Connection, queue: Broker.Queue) {
		super(connection, queue);
	}

	public async send(message: Buffer, opts?: Options.Publish): Promise<void> {
		const channel = await this.connection.createChannel();
		await channel.assertQueue(this.queue, { durable: true });
		channel.sendToQueue(this.queue, message, opts);
	}

	/**
	 * Convenience method.
	 */
	public async shutdown() {
		return this.connection.close();
	}
}

class AmqpConsumer extends Consumer<Buffer, Connection> {
	constructor(
		connection: Connection,
		queue: Broker.Queue,
		fn: (message: Buffer) => Promise<void>,
	) {
		super(connection, queue, fn);
	}

	public async consume(): Promise<void> {
		const channel = await this.connection.createChannel();
		await channel.assertQueue(this.queue, { durable: true });
		await channel.consume(this.queue, (message: ConsumeMessage | null) => {
			if (message) {
				this.fn(message.content);
			}
		});
	}

	/**
	 * Convenience method.
	 */
	public async shutdown() {
		return this.connection.close();
	}
}

export namespace Amqp {
	export interface Options {
		url: string;
	}

	let broker: Amqp | null = null;

	export function getBroker(): Amqp {
		if (broker) {
			return broker;
		}
		broker = new Amqp();
		return broker;
	}

	let producers = new Map<Broker.Queue, AmqpProducer>();

	export async function getProducer(queue: Broker.Queue) {
		const maybeProducer = producers.get(queue);
		if (maybeProducer) {
			return maybeProducer;
		}

		const broker = getBroker();
		const connection = await broker.connect({ url: config.amqp.url });
		const producer = new AmqpProducer(connection, queue);
		producers.set(queue, producer);
		return producer;
	}

	let consumers = new Map<Broker.Queue, AmqpConsumer>();

	export async function getConsumer(
		queue: Broker.Queue,
		fn: (message: Buffer) => Promise<void>,
	) {
		const maybeConsumer = consumers.get(queue);
		if (maybeConsumer) {
			return maybeConsumer;
		}

		const broker = getBroker();
		const connection = await broker.connect({ url: config.amqp.url });
		const consumer = new AmqpConsumer(connection, queue, fn);
		consumers.set(queue, consumer);
		return consumer;
	}

	export async function disconnect() {
		for (const [queue, producer] of producers.entries()) {
			logger.info(`Shutting down producer on queue '${queue}'`);
			await producer.shutdown();
		}

		producers.clear();

		for (const [queue, consumer] of consumers.entries()) {
			logger.info(`Shutting down consumer on queue '${queue}'`);
			await consumer.shutdown();
		}

		consumers.clear();
	}
}
