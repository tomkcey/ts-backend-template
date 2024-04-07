import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import SQL, { SQLStatement } from "sql-template-strings";
import { Database, Executor } from "./db";
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
} from "../utils/errors";

const pool = new Pool({});

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
}

export type Paginate = { take: number; skip: number };

namespace Example {
	type Achievement = {
		id: string;
		name: string;
		description: string;
	};

	export class AchievementDatabase extends PostgresDatabase {
		constructor(executor?: PostgresExecutor) {
			super(executor);
		}

		private mapRowToAchievement(row: QueryResultRow): Achievement {
			return {
				id: row.id,
				name: row.name,
				description: row.description,
			};
		}

		public async listAchievements(
			paginate: Paginate,
		): Promise<Achievement[]> {
			const rows = await this.list(
				SQL`SELECT * FROM achievements LIMIT ${paginate.take} OFFSET ${paginate.skip};`,
			);

			return rows.map((row) => this.mapRowToAchievement(row));
		}

		public async getAchievementById(id: string): Promise<Achievement> {
			const row = await this.unique(
				SQL`SELECT * FROM achievements WHERE id = ${id};`,
			);

			if (!row) {
				throw new NotFoundError(`Achievement with id ${id} not found`);
			}

			return this.mapRowToAchievement(row);
		}

		private async insert(
			data: Omit<Achievement, "id">,
		): Promise<Achievement> {
			const row = await this.unique(
				SQL`INSERT INTO achievements (name, description) VALUES (${data.name}, ${data.description}) RETURNING *;`,
			);

			if (!row) {
				throw new InternalServerError("Failed to create achievement");
			}

			return this.mapRowToAchievement(row);
		}

		public async createAchievement(
			data: Omit<Achievement, "id">,
		): Promise<Achievement> {
			return this.transaction(async (executor) => {
				const db = new AchievementDatabase(executor);

				const achievement = await db.insert(data);

				const auditDb = new AuditDatabase(executor);

				await auditDb.createAudit({
					previous_data: null,
					current_data: JSON.stringify(achievement),
					event: AuditEvent.Created,
					version: 1,
					ref_table: "achievements",
					ref_id: achievement.id,
				});

				return achievement;
			});
		}

		private async update(
			id: string,
			data: Partial<Omit<Achievement, "id">>,
		): Promise<Achievement> {
			if (Object.keys(data).length === 0) {
				throw new BadRequestError("No data provided to update");
			}

			const setStatement = Object.entries(data)
				.reduce<string[]>((acc, [key, value]) => {
					if (value) {
						acc.push(key + " = " + value);
					}
					return acc;
				}, [])
				.join();

			const row = await this.unique(
				SQL`UPDATE achievements SET ${setStatement} WHERE id = ${id} RETURNING *;`,
			);

			if (!row) {
				throw new InternalServerError("Failed to update achievement");
			}

			return this.mapRowToAchievement(row);
		}

		public async updateAchievement(
			id: string,
			data: Partial<Omit<Achievement, "id">>,
		): Promise<Achievement> {
			return this.transaction(async (executor) => {
				const db = new AchievementDatabase(executor);

				const previousAchievement = await db.getAchievementById(id);
				const updatedAchievement = await db.update(id, data);

				const auditDb = new AuditDatabase(executor);

				await auditDb.createAudit({
					previous_data: JSON.stringify(previousAchievement),
					current_data: JSON.stringify(updatedAchievement),
					event: AuditEvent.Updated,
					version: 1,
					ref_table: "achievements",
					ref_id: updatedAchievement.id,
				});

				return updatedAchievement;
			});
		}

		private async delete(id: string) {
			await this.execute(SQL`DELETE FROM achievements WHERE id = ${id};`);
		}

		public async deleteAchievement(id: string) {
			return this.transaction(async (executor) => {
				const db = new AchievementDatabase(executor);

				const achievement = await db.getAchievementById(id);
				await db.delete(id);

				const auditDb = new AuditDatabase(executor);

				await auditDb.createAudit({
					previous_data: JSON.stringify(achievement),
					current_data: null,
					event: AuditEvent.Deleted,
					version: 1,
					ref_table: "achievements",
					ref_id: achievement.id,
				});
			});
		}
	}

	export enum AuditEvent {
		Created = "created",
		Updated = "updated",
		Deleted = "deleted",
	}

	type Audit = {
		id: string;
		version: number;
		event: AuditEvent;
		ref_table: string;
		ref_id: string;
		previous_data: string | null;
		current_data: string | null;
	};

	export class AuditDatabase extends PostgresDatabase {
		constructor(executor?: PostgresExecutor) {
			super(executor);
		}

		private mapRowToAudit(row: QueryResultRow): Audit {
			return {
				id: row.id,
				version: row.version,
				event: row.event,
				ref_table: row.ref_table,
				ref_id: row.ref_id,
				previous_data: row.previous_data,
				current_data: row.current_data,
			};
		}

		public async listAudits(paginate: Paginate): Promise<Audit[]> {
			const rows = await this.list(
				SQL`SELECT * FROM audits LIMIT ${paginate.take} OFFSET ${paginate.skip};`,
			);

			return rows.map((row) => this.mapRowToAudit(row));
		}

		public async getAuditById(id: string): Promise<Audit> {
			const row = await this.unique(
				SQL`SELECT * FROM audits WHERE id = ${id};`,
			);

			if (!row) {
				throw new NotFoundError(`Audit with id ${id} not found`);
			}

			return this.mapRowToAudit(row);
		}

		public async createAudit(data: Omit<Audit, "id">) {
			const row = await this.unique(
				SQL`INSERT INTO audits (version, event, ref_table, ref_id, previous_data, current_data) VALUES (${data.version}, ${data.event}, ${data.ref_table}, ${data.ref_id}, ${data.previous_data}, ${data.current_data}) RETURNING *;`,
			);

			if (!row) {
				throw new InternalServerError("Failed to create audit");
			}

			return this.mapRowToAudit(row);
		}
	}
}
