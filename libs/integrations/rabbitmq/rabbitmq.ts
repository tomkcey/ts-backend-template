import { Channel, connect, Connection, Options } from "amqplib";
import { IBroker, IConsumer, IPublisher } from "../../core/broker";
import { isNil, isNotNil } from "../../core/coersion";

export type RouteMap = { readonly [K: string]: readonly string[] };
type Exchange<R extends RouteMap> = keyof R extends string ? keyof R : never;
type RoutingKey<R extends RouteMap> = R[Exchange<R>][number] extends string
	? R[Exchange<R>][number]
	: never;

export interface Target<R extends RouteMap> {
	readonly exchange: Exchange<R>;
	readonly routingKey: RoutingKey<R>;
}

type TargetTtl<R extends RouteMap> = {
	readonly [K in keyof R as `${string & K}Ttl`]: number;
};

class Publisher<R extends RouteMap> implements IPublisher {
	constructor(
		protected target: Target<R>,
		protected channel: Channel,
	) {}

	public async publish(buffer: Buffer): Promise<void> {
		const canContinue = this.channel.publish(this.target.exchange, this.target.routingKey, buffer);

		if (!canContinue) {
			await new Promise((resolve) => this.channel.once("drain", resolve));
		}
	}
}

class Consumer<R extends RouteMap> implements IConsumer {
	constructor(
		protected target: Target<R> & { queue: string },
		protected channel: Channel,
	) {}

	public async consume(fn: (buffer: Buffer) => Promise<void>): Promise<void> {
		await this.channel.consume(this.target.queue, async (message) => {
			if (message === null) {
				return;
			}

			return fn(message.content)
				.then(() => this.channel.ack(message))
				.catch(() => this.channel.nack(message, false, false));
		});
	}
}

export class Broker<R extends RouteMap> implements IBroker<Target<R>, Publisher<R>, Consumer<R>> {
	protected connection: Connection | null = null;
	protected map = new Map<
		`${Target<R>["exchange"]}:${Target<R>["routingKey"]}`,
		{ queue: string; dlxqueue: string }
	>();

	constructor(protected routing: R) {}

	private serializeTarget(
		target: Target<R>,
	): `${Target<R>["exchange"]}:${Target<R>["routingKey"]}` {
		return `${target.exchange}:${target.routingKey}`;
	}

	private formatDlx(target: Target<R>): { [K in keyof Target<R>]: `${Target<R>[K]}-dlx` } {
		return {
			exchange: `${target.exchange}-dlx`,
			routingKey: `${target.routingKey}-dlx`,
		};
	}

	public async start(options?: Options.Connect & Partial<TargetTtl<R>>): Promise<void> {
		if (isNotNil(this.connection)) {
			return;
		}

		this.connection = await connect({ ...options });

		for (const exchange in this.routing) {
			for (const routingKey of this.routing[exchange as Exchange<R>]) {
				const target = {
					exchange: exchange as Exchange<R>,
					routingKey: routingKey as RoutingKey<R>,
				};

				const channel = await this.connection.createChannel();
				const dlx = this.formatDlx(target);

				await channel.assertExchange(dlx.exchange, "topic");
				await channel.assertExchange(target.exchange, "topic");

				const { queue: dlxqueue } = await channel.assertQueue("", {
					deadLetterExchange: dlx.exchange,
					deadLetterRoutingKey: dlx.routingKey,
				});

				const definedMessageTtl =
					Object.entries(options ?? {}).find(([key]) => key === exchange + "Ttl") ?? [];
				const [_, value] = definedMessageTtl;

				const { queue } = await channel.assertQueue("", {
					messageTtl: typeof value === "number" ? value : 1000 * 60 * 15,
					deadLetterExchange: dlx.exchange,
					deadLetterRoutingKey: dlx.routingKey,
				});

				await channel.bindQueue(queue, target.exchange, target.routingKey);
				await channel.bindQueue(dlxqueue, dlx.exchange, dlx.routingKey);

				const serializedTarget = this.serializeTarget(target);
				this.map.set(serializedTarget, { queue, dlxqueue });
			}
		}
	}

	public async stop(): Promise<void> {
		if (isNil(this.connection)) {
			return;
		}

		await this.connection.close();

		this.connection = null;
	}

	public async getConsumer(target: Target<R>): Promise<Consumer<R>> {
		if (isNil(this.connection)) {
			throw new Error("Broker is not started");
		}

		const channel = await this.connection.createChannel();
		await channel.prefetch(1, false);

		const serializedTarget = this.serializeTarget(target);
		const queueMapResult = this.map.get(serializedTarget);
		if (isNil(queueMapResult)) {
			throw new Error("Queue not found");
		}

		const { queue } = queueMapResult;

		return new Consumer({ ...target, queue }, channel);
	}

	public async getPublisher(target: Target<R>): Promise<Publisher<R>> {
		if (isNil(this.connection)) {
			throw new Error("Broker is not started");
		}

		const channel = await this.connection.createChannel();
		return new Publisher(target, channel);
	}

	public async getMessageCount(target: Target<R>, dlx: boolean = false): Promise<number> {
		if (isNil(this.connection)) {
			throw new Error("Broker is not started");
		}

		const serializedTarget = this.serializeTarget(target);
		const queueMapResult = this.map.get(serializedTarget);
		if (isNil(queueMapResult)) {
			throw new Error("Queue not found");
		}

		const { queue, dlxqueue } = queueMapResult;

		const channel = await this.connection.createChannel();
		const { messageCount } = await channel.checkQueue(dlx ? dlxqueue : queue);
		return messageCount;
	}

	public async purge(target: Target<R>, dlx: boolean = false): Promise<void> {
		if (isNil(this.connection)) {
			throw new Error("Broker is not started");
		}

		const serializedTarget = this.serializeTarget(target);
		const queueMapResult = this.map.get(serializedTarget);
		if (isNil(queueMapResult)) {
			throw new Error("Queue not found");
		}

		const { queue, dlxqueue } = queueMapResult;

		const channel = await this.connection.createChannel();
		await channel.purgeQueue(dlx ? dlxqueue : queue);
	}
}
