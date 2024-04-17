import { isNil, isNotNil } from "./coersion";
import { logger } from "./logging";

export class Node<T> {
	public next?: Node<T>;
	constructor(public value: T) {}
}

export class LinkedList<T> {
	protected head?: Node<T>;
	protected tail?: Node<T>;
	public size: number = 0;

	[Symbol.asyncIterator]() {
		let current = undefined;

		return {
			next: async () => {
				current = this.pop();

				logger.debug(
					`${LinkedList.name} async iterator 'next' called. ${isNotNil(current) ? "Has a value" : "No value"}.`,
				);

				if (isNil(current)) {
					return { done: true, value: undefined };
				}

				const value = current.value;

				return { done: false, value };
			},
		};
	}

	public push(value: T) {
		const node = new Node(value);

		logger.debug(`${LinkedList.name} creating new node.`);

		if (isNotNil(this.tail)) {
			if (this.head === undefined) {
				throw new Error(
					"Head is undefined while tail is defined. Something is wrong.",
				);
			}
			this.tail.next = node;
			this.tail = node;
		} else {
			this.head = node;
			this.tail = node;
		}

		this.size++;
	}

	public pop(): Node<T> | undefined {
		if (isNil(this.head)) {
			return undefined;
		}

		const node = this.head;
		this.head = this.head.next;

		if (isNil(this.head)) {
			this.tail = undefined;
		}

		this.size--;

		return node;
	}
}
