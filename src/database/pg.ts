import { Pool, QueryResult, QueryResultRow } from "pg";
import { SQLStatement } from "sql-template-strings";
import { Database, Executor } from "./db";

const pool = new Pool({});

class PostgresExecutor implements Executor<QueryResult, SQLStatement> {
	public async query(statement: SQLStatement): Promise<QueryResult> {
		return pool.query(statement);
	}

	public async transaction<U>(
		fn: (executor: Executor<QueryResult, SQLStatement>) => Promise<U>,
	): Promise<U> {
		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			const result = await fn(this);

			await client.query("COMMIT");
			return result;
		} catch (error: unknown) {
			client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
}

export const pgExecutor = new PostgresExecutor();

class PostgresDatabase extends Database<
	QueryResult,
	SQLStatement,
	QueryResultRow
> {
	constructor() {
		super(pgExecutor);
	}

	public async list(statement: SQLStatement): Promise<QueryResultRow[]> {
		const { rows } = await this.executor.query(statement);
		return rows;
	}

	public async unique(
		statement: SQLStatement,
	): Promise<QueryResultRow | undefined> {
		const { rows } = await this.executor.query(statement);
		return rows.at(0);
	}
}

export const pgDatabase = new PostgresDatabase();
