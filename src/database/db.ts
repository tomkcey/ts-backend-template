export interface Executor<T, U> {
	query(statement: U): Promise<T>;
	transaction<V>(fn: (executor: Executor<T, U>) => Promise<V>): Promise<V>;
}

export abstract class Database<T, U, V> {
	constructor(protected executor: Executor<T, U>) {}

	protected abstract list(statement: U): Promise<V[]>;
	protected abstract unique(statement: U): Promise<V | undefined>;
}
