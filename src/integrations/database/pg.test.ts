import SQL from "sql-template-strings";
import { Paginate, PostgresDatabase, PostgresExecutor } from "./pg";
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
} from "../../utils/errors";
import { QueryResultRow } from "pg";
import { Database } from "./db";
import { randomUUID } from "crypto";
import { sequential } from "../../utils/async";

type Achievement = {
	id: string;
	name: string;
	description: string;
	createdAt: Date;
	updatedAt: Date;
};

class AchievementDatabase extends PostgresDatabase {
	constructor(executor?: PostgresExecutor) {
		super(executor);
	}

	private mapRowToAchievement(row: QueryResultRow): Achievement {
		return {
			id: row.id,
			name: row.name,
			description: row.description,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}

	public async listAchievements(paginate: Paginate): Promise<Achievement[]> {
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
		data: Omit<Achievement, "id" | "createdAt" | "updatedAt">,
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
		data: Omit<Achievement, "id" | "createdAt" | "updatedAt">,
	): Promise<Achievement> {
		return this.transaction(async (executor) => {
			const db = new AchievementDatabase(executor);

			const achievement = await db.insert(data);

			const auditDb = new AuditDatabase(executor);

			await auditDb.createAudit({
				previousData: null,
				currentData: JSON.stringify(achievement),
				event: AuditEvent.Created,
				version: 1,
				refTable: "achievements",
				refId: achievement.id,
			});

			return achievement;
		});
	}

	private async update(
		id: string,
		data: Partial<Omit<Achievement, "id" | "createdAt">>,
	): Promise<Achievement> {
		if (Object.keys(data).length === 0) {
			throw new BadRequestError("No data provided to update");
		}

		const nameSetStatement = data.name ? `name = '${data.name}'` : null;
		const descriptionSetStatement = data.description
			? `description = '${data.description}'`
			: null;
		const updatedAtSetStatement = `updated_at = now()`;

		const setStatement = [
			nameSetStatement,
			descriptionSetStatement,
			updatedAtSetStatement,
		]
			.filter((statement) => statement !== null)
			.join();

		const row = await this.unique(
			SQL`UPDATE achievements SET `
				.append(setStatement)
				.append(SQL` WHERE id = ${id} RETURNING *;`),
		);

		if (!row) {
			throw new InternalServerError("Failed to update achievement");
		}

		return this.mapRowToAchievement(row);
	}

	public async updateAchievement(
		id: string,
		data: Partial<Omit<Achievement, "id" | "createdAt">>,
	): Promise<Achievement> {
		return this.transaction(async (executor) => {
			const db = new AchievementDatabase(executor);

			const previousAchievement = await db.getAchievementById(id);
			const updatedAchievement = await db.update(id, data);

			const auditDb = new AuditDatabase(executor);

			await auditDb.createAudit({
				previousData: JSON.stringify(previousAchievement),
				currentData: JSON.stringify(updatedAchievement),
				event: AuditEvent.Updated,
				version: 1,
				refTable: "achievements",
				refId: updatedAchievement.id,
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
				previousData: JSON.stringify(achievement),
				currentData: null,
				event: AuditEvent.Deleted,
				version: 1,
				refTable: "achievements",
				refId: achievement.id,
			});
		});
	}
}

enum AuditEvent {
	Created = "created",
	Updated = "updated",
	Deleted = "deleted",
}

type Audit = {
	id: string;
	version: number;
	event: AuditEvent;
	refTable: string;
	refId: string;
	previousData: string | null;
	currentData: string | null;
	createdAt: Date;
};

class AuditDatabase extends PostgresDatabase {
	constructor(executor?: PostgresExecutor) {
		super(executor);
	}

	private mapRowToAudit(row: QueryResultRow): Audit {
		return {
			id: row.id,
			version: row.version,
			event: row.event,
			refTable: row.ref_table,
			refId: row.ref_id,
			previousData: row.previous_data,
			currentData: row.current_data,
			createdAt: row.created_at,
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

	public async createAudit(data: Omit<Audit, "id" | "createdAt">) {
		const row = await this.unique(
			SQL`INSERT INTO audits (version, event, ref_table, ref_id, previous_data, current_data) VALUES (${data.version}, ${data.event}, ${data.refTable}, ${data.refId}, ${data.previousData}, ${data.currentData}) RETURNING *;`,
		);

		if (!row) {
			throw new InternalServerError("Failed to create audit");
		}

		return this.mapRowToAudit(row);
	}
}

class SeedDatabase extends PostgresDatabase {
	public async setup() {
		await this.execute(SQL`CREATE TABLE IF NOT EXISTS achievements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
            );`);

		await this.execute(SQL`CREATE TABLE IF NOT EXISTS audits (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                version INT NOT NULL,
                event TEXT NOT NULL,
                ref_table TEXT NOT NULL,
                ref_id UUID NOT NULL,
                previous_data TEXT,
                current_data TEXT,
                created_at TIMESTAMP DEFAULT NOW()
                );`);
	}

	public async teardown() {
		await this.execute(SQL`DROP TABLE IF EXISTS achievements;`);
		await this.execute(SQL`DROP TABLE IF EXISTS audits;`);
	}
}

describe(Database.name, () => {
	const seedDb = new SeedDatabase();

	beforeEach(async () => {
		await seedDb.setup();
	});

	afterEach(async () => {
		await seedDb.teardown();
	});

	afterAll(async () => {
		await seedDb.shutdown();
	});

	describe(AchievementDatabase.prototype.createAchievement.name, () => {
		it("creates and returns the achievement, also creating an audit entity", async () => {
			const spy = jest.spyOn(AuditDatabase.prototype, "createAudit");

			const db = new AchievementDatabase();
			const achievement = await db.createAchievement({
				name: "test",
				description: "test",
			});

			expect(achievement).toEqual({
				id: expect.any(String),
				name: "test",
				description: "test",
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});
			expect(spy).toHaveBeenCalledWith({
				version: 1,
				event: "created",
				refTable: "achievements",
				refId: achievement.id,
				previousData: null,
				currentData: JSON.stringify(achievement),
			});
		});
	});

	describe(AchievementDatabase.prototype.getAchievementById.name, () => {
		it("returns the achievement associated with the given id", async () => {
			const db = new AchievementDatabase();
			const achievement = await db.createAchievement({
				name: "test",
				description: "test",
			});

			const result = await db.getAchievementById(achievement.id);

			expect(result).toEqual(achievement);
		});

		it("throws a NotFoundError if the achievement does not exist", async () => {
			const db = new AchievementDatabase();

			await expect(db.getAchievementById(randomUUID())).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe(AchievementDatabase.prototype.listAchievements.name, () => {
		it("returns a list of achievements", async () => {
			const db = new AchievementDatabase();
			const achievements = await sequential(
				Array.from({ length: 5 }),
				async () =>
					db.createAchievement({ name: "test", description: "test" }),
			);

			const result = await db.listAchievements({ skip: 0, take: 5 });

			expect(result).toEqual(achievements);
		});

		it("returns a paginated list of achievements", async () => {
			const db = new AchievementDatabase();
			const achievements = await sequential(
				Array.from({ length: 5 }),
				async () =>
					db.createAchievement({ name: "test", description: "test" }),
			);

			const result = await db.listAchievements({ skip: 2, take: 2 });

			expect(result).toEqual(achievements.slice(2, 4));
		});
	});

	describe(AchievementDatabase.prototype.updateAchievement.name, () => {
		it("updates and returns the achievement, also creating an audit entity", async () => {
			const spy = jest.spyOn(AuditDatabase.prototype, "createAudit");

			const db = new AchievementDatabase();
			const achievement = await db.createAchievement({
				name: "test",
				description: "test",
			});

			const updatedAchievement = await db.updateAchievement(
				achievement.id,
				{ name: "anotherTest" },
			);

			expect(updatedAchievement).toEqual({
				id: expect.any(String),
				name: "anotherTest",
				description: "test",
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});
			expect(updatedAchievement.updatedAt).not.toEqual(
				updatedAchievement.createdAt,
			);
			expect(spy).toHaveBeenCalledWith({
				version: 1,
				event: "updated",
				refTable: "achievements",
				refId: updatedAchievement.id,
				previousData: JSON.stringify(achievement),
				currentData: JSON.stringify(updatedAchievement),
			});
		});

		it("throws a BadRequestError if no data is provided", async () => {
			const db = new AchievementDatabase();
			const achievement = await db.createAchievement({
				name: "test",
				description: "test",
			});

			await expect(
				db.updateAchievement(achievement.id, {}),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe(AchievementDatabase.prototype.deleteAchievement.name, () => {
		it("deletes the achievement and creates an audit entity", async () => {
			const spy = jest.spyOn(AuditDatabase.prototype, "createAudit");

			const db = new AchievementDatabase();
			const achievement = await db.createAchievement({
				name: "test",
				description: "test",
			});

			await db.deleteAchievement(achievement.id);

			await expect(db.getAchievementById(achievement.id)).rejects.toThrow(
				NotFoundError,
			);
			expect(spy).toHaveBeenCalledWith({
				version: 1,
				event: "deleted",
				refTable: "achievements",
				refId: achievement.id,
				previousData: JSON.stringify(achievement),
				currentData: null,
			});
		});

		it("throws a NotFoundError if the achievement does not exist", async () => {
			const db = new AchievementDatabase();

			await expect(db.deleteAchievement(randomUUID())).rejects.toThrow(
				NotFoundError,
			);
		});
	});
});
