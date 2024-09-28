import { BaseExecutor, AtomicExecutor, BaseDatabase } from "../../core/database";
import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from "pg";
import { SQLStatement } from "sql-template-strings";
import { isNil } from "../../core/coersion";

class TransactionExecutor extends BaseExecutor<SQLStatement, QueryResult, PoolClient> {
	constructor(client: PoolClient) {
		super(client);
	}

	public async execute(query: SQLStatement): Promise<QueryResult> {
		return this.client.query(query);
	}

	public async stop(): Promise<void> {
		this.client.release();
	}
}

export class PoolExecutor extends AtomicExecutor<SQLStatement, QueryResult, Pool> {
	constructor(options?: PoolConfig) {
		super(new Pool(options));
	}

	public async execute(query: SQLStatement): Promise<QueryResult> {
		return this.client.query(query);
	}

	public async transaction<V>(fn: (executor: TransactionExecutor) => Promise<V>): Promise<V> {
		const client = await this.client.connect();
		const executor = new TransactionExecutor(client);

		return client
			.query("BEGIN")
			.then(() => fn(executor))
			.then(async (result) => {
				await client.query("COMMIT");
				return result;
			})
			.catch(async (error) => {
				await client.query("ROLLBACK");
				throw error;
			})
			.finally(async () => {
				client.release();
			});
	}

	public async stop(): Promise<void> {
		return this.client.end();
	}
}

export abstract class Database<
	Output,
	Executor extends BaseExecutor<SQLStatement, QueryResult> = BaseExecutor<
		SQLStatement,
		QueryResult
	>,
> extends BaseDatabase<Output, SQLStatement, QueryResultRow, Executor> {
	constructor(executor: Executor) {
		super(executor);
	}

	protected async unique(query: SQLStatement): Promise<Output | null> {
		const { rows } = await this.client.execute(query);

		const result = rows.at(0);
		if (isNil(result)) {
			return null;
		}

		return this.map(result);
	}

	protected async list(query: SQLStatement): Promise<Output[]> {
		const { rows } = await this.client.execute(query);
		return rows.map((row) => this.map(row));
	}
}
