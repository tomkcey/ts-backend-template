import { Amqp } from "./amqp";

describe(Amqp.name, () => {
	afterEach(async () => {
		const broker = Amqp.getBroker();
		await broker.disconnect();
	});

	test("consumer receives the same message the producer sent", async () => {
		const producer = await Amqp.getProducer("general");

		const message = "Hello World!";
		await producer.send(Buffer.from(message));

		const rcvd = await new Promise(async (resolve) => {
			const consumer = await Amqp.getConsumer("general", async (buf) => {
				const msg = buf.toString();
				resolve(msg);
			});
			consumer.consume();
		});

		expect(rcvd).toEqual(message);
	});
});
