import { Queue, ConsumableQueue } from "./queues";

describe(Queue.name, () => {
	it("returns the first item that was enqueued", () => {
		const queue = new Queue<number>();

		queue.enqueue(1);
		queue.enqueue(2);
		queue.enqueue(3);

		expect(queue.dequeue()).toEqual(1);
		expect(queue.dequeue()).toEqual(2);
		expect(queue.dequeue()).toEqual(3);
	});

	it("returns nothing if there are no items left in the queue", () => {
		const queue = new Queue<number>();

		queue.enqueue(1);
		queue.enqueue(2);
		queue.dequeue();
		queue.enqueue(3);

		expect(queue.dequeue()).toEqual(2);
		expect(queue.dequeue()).toEqual(3);
		expect(queue.dequeue()).toBeUndefined();
	});

	it("uses the iterator protocol to iterate over all items in the queue without removing them from it", () => {
		const queue = new Queue<number>();
		queue.enqueue(1);
		queue.enqueue(2);
		queue.enqueue(3);

		let value = 0;
		for (const item of queue) {
			expect(item).toEqual(++value);
		}
	});
});

describe(ConsumableQueue.name, () => {
	it("uses the iterator protocol to iterate over all items in the queue, removing them from it in the process", () => {
		const queue = new ConsumableQueue<number>();
		queue.enqueue(1);
		queue.enqueue(2);
		queue.enqueue(3);

		let value = 0;
		for (const item of queue) {
			expect(item).toEqual(++value);
		}

		expect(queue.dequeue()).toBeUndefined();
	});

	describe(ConsumableQueue.prototype.consume.name, () => {
		it("iterates over all items in the queue, removing them from it in the process", () => {
			const queue = new ConsumableQueue<number>();
			queue.enqueue(1);
			queue.enqueue(2);
			queue.enqueue(3);

			let value = 0;

			for (const item of queue.consume()) {
				expect(item).toEqual(++value);
			}

			expect(queue.dequeue()).toBeUndefined();
		});
	});
});
