import { IStartable, IStoppable } from "./types";

export interface IPublisher {
	publish(buffer: Buffer): Promise<void>;
}

export interface IConsumer {
	consume(fn: (buffer: Buffer) => Promise<void>): Promise<void>;
}

export interface IBroker<
	Source = string,
	P extends IPublisher = IPublisher,
	C extends IConsumer = IConsumer,
> extends IStartable,
		IStoppable {
	getPublisher(target: Source): Promise<P>;
	getConsumer(target: Source): Promise<C>;
}
