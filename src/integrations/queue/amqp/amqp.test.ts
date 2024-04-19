import { sleep } from "../../../test/utils";
import { isNotNil } from "../../../utils/coersion";
import { Consumer, Executor, Manager, Producer } from "./amqp";

const queue = "test";
const message = "Hello, World!";

describe(Manager.name, () => {
	const mngr = new Manager();

	afterEach(async () => {
		await mngr.close();
	});

	it("sends messages to and consumes messages from multiple queues using a single executor", async () => {
		const executor = new Executor(mngr);
		const sndr = new Producer(executor);
		const rcvr = new Consumer(executor);

		await sndr.send(queue, Buffer.from(message));
		await sndr.send(queue + "test", Buffer.from(message));

		const resultA = await new Promise(async (resolve) => {
			await rcvr.consume(queue, async (msg) => {
				if (isNotNil(msg)) {
					resolve(msg.content.toString());
				}
			});
		});

		const resultB = await new Promise(async (resolve) => {
			await rcvr.consume(queue + "test", async (msg) => {
				if (isNotNil(msg)) {
					resolve(msg.content.toString());
				}
			});
		});

		// Hack for letting the consumer ack/nack the message
		await sleep(250);

		expect(resultA).toBe(message);
		expect(resultB).toBe(message);
	});

	it("sends message and waits for a response on a temporary queue, processes the response and returns it, using a single executor", async () => {
		const executor = new Executor(mngr);
		const sndr = new Producer(executor);
		const rcvr = new Consumer(executor);

		await rcvr.consume(
			queue,
			async (msg) => msg?.content,
			{ noAck: false },
			{ durable: true },
		);

		const result = await sndr.sendAndReceive(
			queue,
			Buffer.from(message),
			async (msg) => {
				if (isNotNil(msg)) {
					return msg.content.toString();
				}
			},
			undefined,
			{ durable: true },
		);

		// Hack for letting the consumer ack/nack the message
		await sleep(250);

		expect(result).toBe(message);
	});

	it.todo("connection recovery, channel recovery, and consumer recovery");
});
