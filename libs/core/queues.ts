class QueueItem<D> {
	constructor(
		public data: D,
		public next?: QueueItem<D>,
	) {}
}

export class Queue<D> {
	protected head?: QueueItem<D>;
	protected tail?: QueueItem<D>;

	public isEmpty() {
		return !this.head;
	}

	public [Symbol.iterator]() {
		let current = this.head;

		return {
			next() {
				if (current) {
					const data = current.data;
					current = current.next;

					return { value: data, done: false };
				} else {
					return { value: undefined, done: true };
				}
			},
		};
	}

	public enqueue(data: D) {
		const item = new QueueItem(data);

		if (this.tail) {
			this.tail.next = item;
		}

		this.tail = item;

		if (!this.head) {
			this.head = item;
		}
	}

	public dequeue(): D | undefined {
		if (!this.head) {
			return undefined;
		}

		const data = this.head.data;
		this.head = this.head.next;

		if (!this.head) {
			this.tail = undefined;
		}

		return data;
	}
}

export class ConsumableQueue<D> extends Queue<D> {
	public override [Symbol.iterator]() {
		let current = this.head;

		return {
			next: () => {
				if (current) {
					const data = this.dequeue();
					if (!data) {
						throw new Error("Cannot happen");
					}

					current = current.next;

					return { value: data, done: false };
				} else {
					return { value: undefined, done: true };
				}
			},
		};
	}

	public *consume() {
		let data: D | undefined;
		while ((data = this.dequeue())) {
			yield data;
		}
	}
}
