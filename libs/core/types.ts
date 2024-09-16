export interface IStartable {
	start(): Promise<void>;
}

export interface IStoppable {
	stop(): Promise<void>;
}
