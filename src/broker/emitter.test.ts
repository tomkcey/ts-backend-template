import { MessageEmitter } from "./emitter";

describe(MessageEmitter.name, () => {
	afterEach(async () => {
		const broker = MessageEmitter.getBroker();
		broker.disconnect();
	});

	test("consumer receives the same message the producer sent", async () => {
		const message = "Hello World!";

		const rcvd = await new Promise(async (resolve) => {
			const consumer = MessageEmitter.getConsumer(
				"general",
				async (buf) => {
					const msg = buf.toString();
					resolve(msg);
				},
			);

			consumer.consume();

			const producer = MessageEmitter.getProducer("general");

			producer.send(Buffer.from(message));
		});

		expect(rcvd).toEqual(message);
	});
});
