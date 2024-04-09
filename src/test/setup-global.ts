import { GenericContainer } from "testcontainers";
import { orchestrator } from "./utils";

export default async function setup() {
	process.env.PG_URL = "postgres://test:test@localhost:5432/postgres";
	process.env.REDIS_URL = "redis://localhost:6379";

	// Just to make the output more readable
	console.log("\n");

	await orchestrator.add(
		"postgres",
		new GenericContainer("postgres:latest")
			.withNetworkMode("host")
			.withExposedPorts(5432)
			.withEnvironment({
				POSTGRES_PASSWORD: "test",
				POSTGRES_USER: "test",
				PGPASSWORD: "test",
			})
			.withName("postgres-test"),
	);

	await orchestrator.add(
		"redis",
		new GenericContainer("redis:latest")
			.withNetworkMode("host")
			.withExposedPorts(6379)
			.withName("redis-test"),
	);
}
