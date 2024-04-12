import SQL from "sql-template-strings";
import { Paginate, PostgresDatabase, PostgresExecutor } from "./pg";
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
} from "../../utils/errors";
import { QueryResultRow } from "pg";
import { Database } from "./db";
import { sequential } from "../../utils/async";

type Resource = {
	id: number;
	name: string;
	createdAt: Date;
	updatedAt: Date;
};

class ResourceDatabase extends PostgresDatabase {
	constructor(executor?: PostgresExecutor) {
		super(executor);
	}

	private mapRowToResource(row: QueryResultRow): Resource {
		return {
			id: row.id,
			name: row.name,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}

	public async listResources(paginate: Paginate): Promise<Resource[]> {
		const rows = await this.list(
			SQL`SELECT * FROM resources LIMIT ${paginate.take} OFFSET ${paginate.skip};`,
		);

		return rows.map((row) => this.mapRowToResource(row));
	}

	public async getResourceById(id: number): Promise<Resource> {
		const row = await this.unique(
			SQL`SELECT * FROM resources WHERE id = ${id};`,
		);

		if (!row) {
			throw new NotFoundError(`Resource with id ${id} not found`);
		}

		return this.mapRowToResource(row);
	}

	private async insert(
		data: Omit<Resource, "id" | "createdAt" | "updatedAt">,
	): Promise<Resource> {
		const row = await this.unique(
			SQL`INSERT INTO resources (name) VALUES (${data.name}) RETURNING *;`,
		);

		if (!row) {
			throw new InternalServerError("Failed to create resource");
		}

		return this.mapRowToResource(row);
	}

	public async createResource(
		data: Omit<Resource, "id" | "createdAt" | "updatedAt">,
	): Promise<Resource> {
		return this.transaction(async (executor) => {
			const db = new ResourceDatabase(executor);

			const resource = await db.insert(data);

			return resource;
		});
	}

	private async update(
		id: number,
		data: Partial<Omit<Resource, "id" | "createdAt">>,
	): Promise<Resource> {
		if (Object.keys(data).length === 0) {
			throw new BadRequestError("No data provided to update");
		}

		const nameSetStatement = data.name ? `name = '${data.name}'` : null;
		const updatedAt = `updated_at = now()`;

		const setStatement = [nameSetStatement, updatedAt]
			.filter((statement) => statement !== null)
			.join();

		const row = await this.unique(
			SQL`UPDATE resources SET `
				.append(setStatement)
				.append(SQL` WHERE id = ${id} RETURNING *;`),
		);

		if (!row) {
			throw new InternalServerError("Failed to update resource");
		}

		return this.mapRowToResource(row);
	}

	public async updateResource(
		id: number,
		data: Partial<Omit<Resource, "id" | "createdAt">>,
	): Promise<Resource> {
		return this.transaction(async (executor) => {
			const db = new ResourceDatabase(executor);

			const updatedResource = await db.update(id, data);

			return updatedResource;
		});
	}

	public async deleteResource(id: number): Promise<void> {
		const resource = await this.getResourceById(id);

		if (!resource) {
			throw new NotFoundError(`Resource with id ${id} not found`);
		}

		await this.transaction(async (executor) => {
			const db = new ResourceDatabase(executor);

			await db.execute(SQL`DELETE FROM resources WHERE id = ${id};`);
		});
	}
}

class SeedDatabase extends PostgresDatabase {
	public async setup() {
		await this.execute(SQL`CREATE TABLE IF NOT EXISTS resources (
		 	id serial primary key,
		 	name text not null,
		 	created_at timestamptz not null default now(),
		 	updated_at timestamptz not null default now()
		)`);
	}

	public async teardown() {
		await this.execute(SQL`DROP TABLE IF EXISTS resources;`);
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

	describe(ResourceDatabase.prototype.createResource.name, () => {
		it("creates and returns the resource", async () => {
			const db = new ResourceDatabase();
			const resource = await db.createResource({
				name: "test",
			});

			expect(resource).toEqual({
				id: 1,
				name: "test",
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});
		});
	});

	describe(ResourceDatabase.prototype.getResourceById.name, () => {
		it("returns the resource associated with the given id", async () => {
			const db = new ResourceDatabase();
			const resource = await db.createResource({
				name: "test",
			});

			const result = await db.getResourceById(resource.id);

			expect(result).toEqual(resource);
		});

		it("throws a NotFoundError if the resource does not exist", async () => {
			const db = new ResourceDatabase();

			await expect(db.getResourceById(9)).rejects.toThrow(NotFoundError);
		});
	});

	describe(ResourceDatabase.prototype.listResources.name, () => {
		it("returns a list of resources", async () => {
			const db = new ResourceDatabase();
			const resources = await sequential(
				Array.from({ length: 5 }),
				async () => db.createResource({ name: "test" }),
			);

			const result = await db.listResources({ skip: 0, take: 5 });

			expect(result).toEqual(resources);
		});

		it("returns a paginated list of resources", async () => {
			const db = new ResourceDatabase();
			const resources = await sequential(
				Array.from({ length: 5 }),
				async () => db.createResource({ name: "test" }),
			);

			const result = await db.listResources({ skip: 2, take: 2 });

			expect(result).toEqual(resources.slice(2, 4));
		});
	});

	describe(ResourceDatabase.prototype.updateResource.name, () => {
		it("updates and returns the resource", async () => {
			const db = new ResourceDatabase();
			const resource = await db.createResource({
				name: "test",
			});

			const updatedResource = await db.updateResource(resource.id, {
				name: "anotherTest",
			});

			expect(updatedResource).toEqual({
				id: resource.id,
				name: "anotherTest",
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});
			expect(updatedResource.updatedAt).not.toEqual(
				updatedResource.createdAt,
			);
		});

		it("throws a BadRequestError if no data is provided", async () => {
			const db = new ResourceDatabase();
			const resource = await db.createResource({
				name: "test",
			});

			await expect(db.updateResource(resource.id, {})).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe(ResourceDatabase.prototype.deleteResource.name, () => {
		it("deletes the resource", async () => {
			const db = new ResourceDatabase();
			const resource = await db.createResource({
				name: "test",
			});

			await db.deleteResource(resource.id);

			await expect(db.getResourceById(resource.id)).rejects.toThrow(
				NotFoundError,
			);
		});

		it("throws a NotFoundError if the resource does not exist", async () => {
			const db = new ResourceDatabase();

			await expect(db.deleteResource(9)).rejects.toThrow(NotFoundError);
		});
	});
});
