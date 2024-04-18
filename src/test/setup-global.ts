import { GenericContainer, Wait } from "testcontainers";
import { orchestrator } from "./utils";

const RABBITMQ_READY_MESSAGE = "Time to start RabbitMQ" as const;
const MINIO_READY_MESSAGE = "MinIO Object Storage Server" as const;

export default async function setup() {
	process.env.PG_URL = "postgres://test:test@localhost:5432/postgres";
	process.env.REDIS_URL = "redis://localhost:6379";
	process.env.AMQP_URL = "amqp://test:test@localhost:5672";
	process.env.MINIO_URL = "127.0.0.1";
	process.env.MINIO_PORT = "9000";
	process.env.MINIO_ACCESS_KEY = "miniousertest";
	process.env.MINIO_SECRET_KEY = "miniousertest";

	// Just to make the output more readable
	process.stdout.write("\n");

	if (process.argv.includes("--no-setup")) {
		return;
	}

	if (process.env.ENABLE_TEST_RABBITMQ_CONTAINER === "true") {
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
				.withWaitStrategy(Wait.forLogMessage(RABBITMQ_READY_MESSAGE)),
		);
	}

	if (process.env.ENABLE_TEST_MINIO_CONTAINER === "true") {
		await orchestrator.add(
			"minio",
			new GenericContainer("quay.io/minio/minio")
				.withNetworkMode("host")
				.withExposedPorts({ container: 9000, host: 9000 })
				.withEnvironment({
					MINIO_ROOT_USER: "miniousertest",
					MINIO_ROOT_PASSWORD: "miniousertest",
				})
				.withName("minio-test")
				.withCommand(["server", "/data", "--console-address", ":9001"])
				.withWaitStrategy(Wait.forLogMessage(MINIO_READY_MESSAGE)),
		);
	}

	if (process.env.ENABLE_TEST_POSTGRES_CONTAINER === "true") {
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
	}

	if (process.env.ENABLE_TEST_REDIS_CONTAINER === "true") {
		await orchestrator.add(
			"redis",
			new GenericContainer("redis:latest")
				.withNetworkMode("host")
				.withExposedPorts({ container: 6379, host: 6379 })
				.withName("redis-test"),
		);
	}
}
