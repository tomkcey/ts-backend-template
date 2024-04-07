import { AsyncLocalStorage } from "async_hooks";

type TransactionScope = "local" | "global";

export const transactionStore = new AsyncLocalStorage<Executor>();

export interface Executor {
	/**
	 * If the current context holds a transaction client, use it.
	 */
	query<T, U = string>(statement: U): Promise<T>;
	/**
	 * A globally scoped transaction would use the AsyncLocalStorage to store the transaction client and reuse it in children scopes
	 */
	transaction<U>(
		fn: (executor: Executor) => Promise<U>,
		scope: TransactionScope,
	): Promise<U>;
}

type DatabaseOptions = {
	list?<T>(result: unknown): T[];
	unique?<T>(result: unknown): T;
};

type TransactionOptions = {
	scope: TransactionScope;
};

export class Database<T, U = string> {
	constructor(
		protected executor: Executor,
		protected options?: DatabaseOptions,
	) {}

	/**
	 * @example
	 *
	 * await db.list("SELECT * FROM resources");
	 */
	public async list(statement: U): Promise<T[]> {
		const result = await this.executor.query<T[], U>(statement);
		if (this.options?.list) {
			return this.options.list(result);
		}
		return result;
	}

	/**
	 * @example
	 *
	 * await db.unique("SELECT * FROM resources WHERE id = $1");
	 */
	public async unique(statement: U): Promise<T> {
		const result = await this.executor.query<T, U>(statement);
		if (this.options?.unique) {
			return this.options.unique(result);
		}
		return result;
	}

	/**
	 * @example
	 *
	 * await db.transaction(async (executor) => {
	 *    const inline = await executor.query("SELECT * FROM resources");
	 *    const oop = await new Database(executor).query("SELECT * FROM resources");
	 *    return { inline, oop };
	 * })
	 */
	public async transaction<V>(
		fn: (executor: Executor) => Promise<V>,
		options: TransactionOptions = { scope: "local" },
	): Promise<V> {
		return this.executor.transaction(fn, options.scope);
	}

	/**
	 * @example
	 *
	 * await db.query("SELECT * FROM resources")
	 */
	public async query<T>(statement: U): Promise<T> {
		return this.executor.query<T, U>(statement);
	}
}
