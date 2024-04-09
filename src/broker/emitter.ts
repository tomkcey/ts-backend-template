import { Broker, Consumer, Producer } from "./broker";
import { logger } from "../utils/logging";
import EventEmitter from "events";

class Emitter extends EventEmitter<Record<Broker.Queue, unknown[]>> {
	public queues: Record<Broker.Queue, Buffer[]> = { general: [] };

	public push(queue: Broker.Queue, message: Buffer) {
		this.queues[queue].push(message);
	}

	public take(queue: Broker.Queue) {
		return this.queues[queue].shift();
	}

	public clear() {
		for (const queue in this.queues) {
			this.queues[queue as Broker.Queue] = [];
		}
	}
}

export class MessageEmitter implements Broker<Emitter, {}> {
	private emitter: Emitter;

	constructor() {
		this.emitter = new Emitter();
	}

	public connect(_options: {} = {}): Emitter {
		return this.emitter;
	}

	public disconnect(): void {
		this.emitter.clear();
	}
}

class MessageEmitterProducer extends Producer<Buffer, Emitter> {
	constructor(connection: Emitter, queue: Broker.Queue) {
		super(connection, queue);
	}

	public send(message: Buffer) {
		this.connection.push(this.queue, message);
		this.connection.emit(this.queue);
	}

	/**
	 * Convenience method.
	 */
	public shutdown() {
		return this.connection.clear();
	}
}

class MessageEmitterConsumer extends Consumer<Buffer, Emitter> {
	constructor(
		connection: Emitter,
		queue: Broker.Queue,
		fn: (message: Buffer) => Promise<void>,
	) {
		super(connection, queue, fn);
	}

	public consume(): void {
		this.connection.on(this.queue, () => {
			const message = this.connection.take(this.queue);
			if (message) {
				this.fn(message);
			}
		});
	}

	/**
	 * Convenience method.
	 */
	public shutdown() {
		return this.connection.clear();
	}
}

export namespace MessageEmitter {
	let broker: MessageEmitter | null = null;

	export function getBroker(): MessageEmitter {
		if (broker) {
			return broker;
		}
		broker = new MessageEmitter();
		return broker;
	}

	let producers = new Map<Broker.Queue, MessageEmitterProducer>();

	export function getProducer(queue: Broker.Queue) {
		const maybeProducer = producers.get(queue);
		if (maybeProducer) {
			return maybeProducer;
		}

		const broker = getBroker();
		const connection = broker.connect();
		const producer = new MessageEmitterProducer(connection, queue);
		producers.set(queue, producer);
		return producer;
	}

	let consumers = new Map<Broker.Queue, MessageEmitterConsumer>();

	export function getConsumer(
		queue: Broker.Queue,
		fn: (message: Buffer) => Promise<void>,
	) {
		const maybeConsumer = consumers.get(queue);
		if (maybeConsumer) {
			return maybeConsumer;
		}

		const broker = getBroker();
		const connection = broker.connect();
		const consumer = new MessageEmitterConsumer(connection, queue, fn);
		consumers.set(queue, consumer);
		return consumer;
	}

	export function disconnect() {
		for (const [queue, producer] of producers.entries()) {
			logger.info(`Shutting down producer on queue '${queue}'`);
			producer.shutdown();
		}

		producers.clear();

		for (const [queue, consumer] of consumers.entries()) {
			logger.info(`Shutting down consumer on queue '${queue}'`);
			consumer.shutdown();
		}

		consumers.clear();
	}
}
