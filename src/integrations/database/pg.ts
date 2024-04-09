import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { SQLStatement } from "sql-template-strings";
import { Database, Executor } from "./db";
import { config } from "../../utils/config";

const pool = new Pool({ connectionString: config.pg.url });

export class PostgresExecutor implements Executor<QueryResult, SQLStatement> {
	constructor(protected client: Pool | PoolClient = pool) {}

	public async query(statement: SQLStatement): Promise<QueryResult> {
		return this.client.query(statement);
	}

	public async transaction<U>(
		fn: (executor: PostgresExecutor) => Promise<U>,
	): Promise<U> {
		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			const result = await fn(new PostgresExecutor(client));

			await client.query("COMMIT");
			return result;
		} catch (error: unknown) {
			client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	/**
	 * Beware as this will shutdown the pool of connections.
	 */
	public async shutdown(): Promise<void> {
		return pool.end();
	}
}

export class PostgresDatabase extends Database<
	QueryResult,
	SQLStatement,
	QueryResultRow
> {
	constructor(protected executor: PostgresExecutor = new PostgresExecutor()) {
		super(executor);
	}

	protected async list(statement: SQLStatement): Promise<QueryResultRow[]> {
		const { rows } = await this.executor.query(statement);
		return rows;
	}

	protected async unique(
		statement: SQLStatement,
	): Promise<QueryResultRow | undefined> {
		const { rows } = await this.executor.query(statement);
		return rows.at(0);
	}

	protected async execute(statement: SQLStatement): Promise<void> {
		await this.executor.query(statement);
	}

	protected async transaction<T>(
		fn: (executor: PostgresExecutor) => Promise<T>,
	): Promise<T> {
		return this.executor.transaction(fn);
	}

	public async shutdown(): Promise<void> {
		return this.executor.shutdown();
	}
}

export type Paginate = { take: number; skip: number };
