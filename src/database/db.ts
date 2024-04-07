export interface Executor<T, U> {
	query(statement: U): Promise<T>;
	transaction<V>(fn: (executor: Executor<T, U>) => Promise<V>): Promise<V>;
}

export abstract class Database<T, U, V> {
	constructor(protected executor: Executor<T, U>) {}

	public abstract list(statement: U): Promise<V[]>;
	public abstract unique(statement: U): Promise<V | undefined>;
}
