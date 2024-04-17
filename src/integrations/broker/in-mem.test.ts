import { sleep } from "../../test/utils";
import { sequential } from "../../utils/async";
import { Queue, Consumer, Broker } from "./in-mem";

const message = "Hello, World!";
const queue = "test";

describe(Queue.name, () => {
	it("stores the value and returns it when enqueuing and then immediately dequeueing", async () => {
		const q = new Queue(queue);

		expect(q.length).toBe(0);

		q.enqueue(Buffer.from(message));

		expect(q.length).toBe(1);

		const buf = q.dequeue();

		expect(q.length).toBe(0);
		expect(buf?.toString()).toEqual(message);
	});

	describe(Consumer.name, () => {
		// TODO: An actual test
		test("all subscribed consumers receive the messages currently being broadcast", async () => {
			const q = new Queue(queue);

			const consumers = [new Consumer(), new Consumer()];

			q.enqueue(Buffer.from(message));
			q.enqueue(Buffer.from(message));
			q.enqueue(Buffer.from(message));

			const unsubscribes = consumers.map((c) => q.subscribe(c));

			await sequential(unsubscribes, async (unsubscribe) => {
				q.enqueue(Buffer.from(message));
				q.enqueue(Buffer.from(message));
				q.enqueue(Buffer.from(message));

				unsubscribe();

				await sleep(250);
			});
		});
	});
});

describe(Broker.name, () => {
	it("sends and receives the same message", async () => {
		const message = "Hello, World!";

		const broker = new Broker();

		let unsub = () => {};

		const result = await new Promise((resolve) => {
			const { unsubscribe } = broker.receive("test", (buf) => {
				resolve(buf.toString());
			});

			broker.send("test", Buffer.from(message));

			unsub = unsubscribe;
		});

		expect(result).toEqual(message);

		unsub();

		broker.closeAll();
	});
});
