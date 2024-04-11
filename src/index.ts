import { otlpSdk } from "./utils/otlp";
import { logger } from "./utils/logging";
import { MaybePromise } from "./utils/async";

async function main<T>(execute: () => MaybePromise<T>) {
	process.on("SIGINT", () => {
		logger.info("Shutting down OTLP client.");
		otlpSdk.shutdown().then(() => {
			logger.info("OTLP client shut down.");
			process.exit(0);
		});
	});

	await execute();
}

void main(() => {});
