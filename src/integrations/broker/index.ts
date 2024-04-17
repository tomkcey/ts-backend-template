import { OperationExecutor } from "./interfaces";

export { ConnectionManager, OperationExecutor } from "./interfaces";
export { Receiver, Operator, Sender } from "./amqp";
export { Broker, Consumer, Queue } from "./in-mem";

import {
	Manager,
	sendAndReceive as sndAndRcv,
	receive as rcv,
	send as snd,
} from "./amqp";
import { isNotNil } from "../../utils/coersion";
import { Options } from "amqplib";
import { randomUUID } from "crypto";

export class Amqp implements OperationExecutor<Buffer> {
	constructor(public mngr: Manager) {}

	public async send(
		queue: string,
		message: Buffer,
		op: Options.Publish = {},
		oq: Options.AssertQueue = {},
	) {
		return snd(
			message,
			{ queue, ...oq },
			{
				messageId: randomUUID(),
				timestamp: new Date().getTime(),
				...op,
			},
		);
	}

	public async receive(
		queue: string,
		fn: (message: Buffer) => Promise<void>,
		oc: Options.Consume = {},
		oq: Options.AssertQueue = {},
	) {
		const rcvr = rcv(
			async (msg) => {
				if (isNotNil(msg)) {
					return fn(msg.content);
				}
			},
			{ queue, ...oq },
			{ noAck: false, ...oc },
		);

		return rcvr.id;
	}

	public async sendAndReceive(
		queue: string,
		message: Buffer,
		fn: (message: Buffer) => Promise<Buffer>,
	) {
		return sndAndRcv(
			message,
			async (b) => {
				if (isNotNil(b)) {
					return fn(b.content);
				}

				throw new Error("Message is null.");
			},
			queue,
		);
	}
}
