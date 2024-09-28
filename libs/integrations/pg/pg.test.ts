import { QueryResultRow } from "pg";
import { Database, PoolExecutor } from "./pg";
import SQL from "sql-template-strings";
import { isNil } from "../../core/coersion";

class Entity {
	constructor(
		public id: number,
		public name: string,
	) {}
}

class TestDatabase extends Database<Entity, PoolExecutor> {
	constructor(executor: PoolExecutor) {
		super(executor);
	}

	protected map(row: QueryResultRow): Entity {
		return new Entity(row.id, row.name);
	}

	public async createTable(): Promise<void> {
		await this.client.execute(SQL`CREATE TABLE test (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`);
	}

	public async purgeTable(): Promise<void> {
		await this.client.execute(SQL`TRUNCATE TABLE test`);
	}

	public async insertEntity(name: string): Promise<Entity> {
		const result = await this.unique(SQL`INSERT INTO test (name) VALUES (${name}) RETURNING *`);
		if (isNil(result)) {
			throw new Error("Failed to insert entity");
		}
		return result;
	}

	public async listEntities(): Promise<Entity[]> {
		return this.list(SQL`SELECT * FROM test`);
	}

	public async findEntity(id: number): Promise<Entity | null> {
		return this.unique(SQL`SELECT * FROM test WHERE id = ${id}`);
	}

	public async updateEntity(id: number, name: string): Promise<Entity> {
		const result = await this.unique(
			SQL`UPDATE test SET name = ${name} WHERE id = ${id} RETURNING *`,
		);

		if (isNil(result)) {
			throw new Error("Failed to insert entity");
		}
		return result;
	}

	public async deleteEntity(id: number): Promise<void> {
		await this.client.execute(SQL`DELETE FROM test WHERE id = ${id}`);
	}

	public async trx() {
		return this.client.transaction(async (executor) => {
			executor.execute(SQL`INSERT INTO test (name) VALUES ('test')`);

			throw new Error("Rollback");
		});
	}
}

describe(Database.name, () => {
	const executor = new PoolExecutor({
		host: "localhost",
		port: 5432,
		user: "localuser",
		password: "localpass",
		database: "postgres",
		ssl: false,
	});
	const db = new TestDatabase(executor);

	beforeAll(async () => db.createTable());
	beforeEach(async () => db.purgeTable());

	afterAll(async () => executor.stop());

	it("persists, mutates and removes an entity", async () => {
		const entity = await db.insertEntity("test");

		expect(entity).toEqual({
			id: expect.any(Number),
			name: "test",
		});

		const fetchedEntity = await db.findEntity(entity.id);

		expect(fetchedEntity).toEqual(entity);

		const updatedEntity = await db.updateEntity(entity.id, "updated");

		expect(updatedEntity).toEqual({
			id: entity.id,
			name: "updated",
		});

		const entities = await db.listEntities();

		expect(entities).toEqual([updatedEntity]);

		await db.deleteEntity(entity.id);

		const noEntity = await db.findEntity(entity.id);

		expect(noEntity).toBeNull();
	});

	it("rolls back a transaction upon failure", async () => {
		await expect(async () => db.trx()).rejects.toThrow("Rollback");

		const entities = await db.listEntities();

		expect(entities).toEqual([]);
	});
});
