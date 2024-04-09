import { GenericContainer, Wait } from "testcontainers";
import { orchestrator } from "./utils";

export default async function setup() {
	process.env.PG_URL = "postgres://test:test@localhost:5432/postgres";
	process.env.REDIS_URL = "redis://localhost:6379";
	process.env.AMQP_URL = "amqp://test:test@localhost:5672";

	// Just to make the output more readable
	console.log("\n");

	await orchestrator.add(
		"rabbitmq",
		new GenericContainer("rabbitmq:3.13.1")
			.withNetworkMode("host")
			.withExposedPorts({ container: 5672, host: 5672 })
			.withEnvironment({
				RABBITMQ_DEFAULT_USER: "test",
				RABBITMQ_DEFAULT_PASS: "test",
			})
			.withName("rabbitmq-test")
			.withWaitStrategy(Wait.forLogMessage("Time to start RabbitMQ")),
	);

	await orchestrator.add(
		"postgres",
		new GenericContainer("postgres:latest")
			.withNetworkMode("host")
			.withExposedPorts({ container: 5432, host: 5432 })
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
			.withExposedPorts({ container: 6379, host: 6379 })
			.withName("redis-test"),
	);
}
