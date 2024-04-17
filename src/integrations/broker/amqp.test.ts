import { sleep } from "../../test/utils";
import { sequential } from "../../utils/async";
import { isNotNil } from "../../utils/coersion";
import { config } from "../../utils/config";
import { randomHex } from "../../utils/rand";
import { Manager, Operator, Receiver, Sender, sendAndReceive } from "./amqp";

const message = "Hello World!";
const queue = "test";

async function cleanup() {
	const mngr = new Manager();
	const op = new Operator(mngr, randomHex(3));

	await op.empty(queue).catch(() => {});

	await op.shutdown();
}

const DEFAULT_WAIT_MS = 500;
/**
 * Wait for the message to be acknowledged.
 *
 * Normally this wouldn't be required as our consumer would listen indefinitely,
 * except in the case of a temporary queue whose consumer only waits for a predefined amount of messages to be received before closing.
 *
 * In that case in can be handled in a like manner, with a very short sleep duration.
 *
 * Default sleep duration is `DEFAULT_WAIT_MS`.
 */
async function wait(ms: number = DEFAULT_WAIT_MS) {
	await sleep(ms);
}

describe(Manager.name, () => {
	it("sets and unsets the connection reference", async () => {
		const map = new Map();
		const mngr = new Manager(config.amqp.url, {}, map);

		const id = randomHex(3);

		const setSpy = jest.spyOn(map, "set");
		const delSpy = jest.spyOn(map, "delete");

		const c = await mngr.connect(id);
		await mngr.close(id);

		expect(setSpy).toHaveBeenLastCalledWith(id, c);
		expect(delSpy).toHaveBeenLastCalledWith(id);
	});

	it("closes the underlying connection", async () => {
		const mngr = new Manager();

		const id = randomHex(3);

		const c = await mngr.connect(id);

		const spy = jest.spyOn(c, "close");

		await mngr.close(id);

		expect(spy).toHaveBeenCalled();
	});

	it("reuses connections", async () => {
		const map = new Map();
		const mngr = new Manager(config.amqp.url, {}, map);

		const id = randomHex(3);

		const spy = jest.spyOn(map, "set");

		await mngr.connect(id);
		await mngr.connect(id);

		expect(spy).toHaveBeenCalledTimes(1);

		await wait();

		await mngr.closeAll();
	});
});

describe(Operator.name, () => {
	describe(Operator.prototype.queue.name, () => {
		it("creates the queue and returns the channel", async () => {
			const id = randomHex(3);
			const map = new Map();

			const mngr = new Manager(config.amqp.url, {}, map);
			const sndr = new Operator(mngr, id);

			const ch = await sndr.queue(queue);

			await expect(ch.checkQueue(queue)).resolves.not.toThrow();

			await sndr.shutdown();
		});
	});

	describe(Operator.prototype.shutdown.name, () => {
		it("calls the manager to shut down the connection", async () => {
			const id = randomHex(3);
			const map = new Map();

			const mngr = new Manager(config.amqp.url, {}, map);
			const sndr = new Operator(mngr, id);

			const getSpy = jest.spyOn(map, "get");
			const setSpy = jest.spyOn(map, "set");
			const delSpy = jest.spyOn(map, "delete");
			const closeSpy = jest.spyOn(Manager.prototype, "close");

			await sndr.queue(queue);

			await sndr.shutdown();

			expect(getSpy).toHaveBeenLastCalledWith(id);
			expect(setSpy).toHaveBeenLastCalledWith(id, expect.anything());
			expect(delSpy).toHaveBeenLastCalledWith(id);
			expect(closeSpy).toHaveBeenLastCalledWith(id);
		});
	});

	describe(Operator.prototype.empty.name, () => {
		it("empties the queue", async () => {
			const mngr = new Manager();
			const sndr = new Sender(mngr);
			const op = new Operator(mngr, randomHex(3));

			const queue = "test";

			await sndr.send(Buffer.from(message), { queue });

			const { messageCount: messageCountBeforePurge } =
				await op.read(queue);

			await op.empty(queue);

			const { messageCount: messageCountAfterPurge } =
				await op.read(queue);

			expect(messageCountBeforePurge).toBe(1);
			expect(messageCountAfterPurge).toBe(0);

			await mngr.closeAll();
		});
	});

	describe(Operator.prototype.read.name, () => {
		it("returns details about the queue", async () => {
			const mngr = new Manager();
			const sndr = new Sender(mngr);
			const op = new Operator(mngr, randomHex(3));

			await sndr.send(Buffer.from(message), { queue });

			const { consumerCount, messageCount } = await op.read(queue);

			expect(consumerCount).toBe(0);
			expect(messageCount).toBe(1);

			await mngr.closeAll();
		});
	});

	describe(Sender.name, () => {
		beforeEach(async () => cleanup());

		describe(Sender.prototype.send.name, () => {
			it("pushes a message into the queue", async () => {
				const mngr = new Manager();
				const sndr = new Sender(mngr);

				const { messageCount: messageCountBeforeSend } =
					await sndr.read(queue);

				await sndr.send(Buffer.from(message), { queue });

				const { messageCount: messageCountAfterSend } =
					await sndr.read(queue);

				expect(messageCountBeforeSend).toBe(0);
				expect(messageCountAfterSend).toBe(1);

				await sndr.shutdown();
			});
		});
	});

	describe(Receiver.name, () => {
		beforeEach(async () => cleanup());

		describe(Receiver.prototype.receive.name, () => {
			it("receives the message that was pushed into the queue", async () => {
				const mngr = new Manager();
				const rcvr = new Receiver(mngr);
				const sndr = new Sender(mngr);

				let r = await new Promise<Buffer>(async (resolve) => {
					rcvr.receive(
						async (msg) => {
							if (isNotNil(msg)) {
								return resolve(msg.content);
							}
						},
						{ queue },
						{ noAck: false },
					);

					await sndr.send(Buffer.from(message), { queue });
				});

				expect(r.toString()).toEqual(message);

				await wait();

				await mngr.closeAll();
			});

			it("receives the messages that were pushed into the queue one at a time", async () => {
				const mngr = new Manager(config.amqp.url, {});
				const rcvr = new Receiver(mngr);
				const sndr = new Sender(mngr);

				const arr = Array.from({ length: 50 });

				expect.assertions(arr.length);

				let curIdx = 0;
				await new Promise<void>(async (resolve) => {
					rcvr.receive(
						async (msg) => {
							if (isNotNil(msg)) {
								const rcvdIdx = parseInt(
									msg.properties.messageId,
								);

								expect(curIdx).toBe(rcvdIdx);
								curIdx++;

								if (rcvdIdx === arr.length - 1) {
									return resolve();
								}
							}
						},
						{ queue },
						{ noAck: false },
					);

					await sequential(arr, async (_, idx) =>
						sndr.send(
							Buffer.from(message),
							{ queue },
							{ messageId: idx.toString() },
						),
					);
				});

				await wait();

				await mngr.closeAll();
			});
		});
	});
});

describe(sendAndReceive.name, () => {
	it("sends a message on a queue and then receives a response on another, temporary, queue", async () => {
		const result = await sendAndReceive(
			Buffer.from(message),
			async (msg) => {
				if (isNotNil(msg)) {
					return msg.content;
				}

				throw new Error("There is no message.");
			},
			queue,
		);

		expect(result.toString()).toEqual(message);
	});
});
