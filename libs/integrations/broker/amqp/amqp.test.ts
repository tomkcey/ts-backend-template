import { sleep } from "../../../core/async";
import { Broker, Target } from "./amqp";

const ROUTING = { exchange: ["routing.key", "routing.dummy"] } as const;

const broker = new Broker(ROUTING);

describe(Broker.name, () => {
	const [target, dummyTarget]: Target<typeof ROUTING>[] = [
		{
			exchange: "exchange",
			routingKey: "routing.key",
		},
		{
			exchange: "exchange",
			routingKey: "routing.dummy",
		},
	];

	beforeAll(async () =>
		broker.start({ username: "localuser", password: "localpass", exchangeTtl: 1000 }),
	);

	afterAll(async () => broker.stop());

	afterEach(async () => {
		await broker.purge(target);
		await broker.purge(target, true);
	});

	it("sends the message to provided routing key", async () => {
		const publisher = await broker.getPublisher(target);

		const countBefore = await broker.getMessageCount(target);
		expect(countBefore).toEqual(0);

		await publisher.publish(Buffer.from("Hello, World!"));

		const countAfter = await broker.getMessageCount(target);
		expect(countAfter).toEqual(1);

		const countBypass = await broker.getMessageCount(dummyTarget);
		expect(countBypass).toEqual(0);
	});

	it("sends the message to dead-letter-exchange after failing", async () => {
		const consumer = await broker.getConsumer(target);

		const count = await new Promise<number>(async (resolve) => {
			await consumer.consume(async (m) => {
				const str = m.toString("utf8");
				if (str === "Hello, World!") {
					throw new Error("Invalid message");
				}
			});

			const interval = setInterval(async () => {
				const dlxMessageCount = await broker.getMessageCount(
					{
						exchange: "exchange",
						routingKey: "routing.key",
					},
					true,
				);

				if (dlxMessageCount > 0) {
					clearInterval(interval);
					resolve(dlxMessageCount);
				}
			}, 100);

			const publisher = await broker.getPublisher(target);
			await publisher.publish(Buffer.from("Hello, World!"));
		});

		expect(count).toEqual(1);
	});

	it("send the message to dead-letter-exchange after ttl reached", async () => {
		const publisher = await broker.getPublisher(target);

		await publisher.publish(Buffer.from("Hello, World!"));

		await sleep(1000);

		const count = await broker.getMessageCount(target, true);

		expect(count).toEqual(1);
	});
});
