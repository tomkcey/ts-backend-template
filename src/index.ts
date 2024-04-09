import { bootstrap } from "./app";
import { otlpSdk } from "./utils/otlp";
import { config } from "./utils/config";
import { logger } from "./utils/logging";
import { RateLimiter } from "./middlewares/limiting";
import { InMemoryCache } from "./integrations/cache/in-mem-cache";

async function main() {
	// Switch to another Cache<number> implementation at your leisure.
	const limiter = RateLimiter.withCache(new InMemoryCache());
	const app = await bootstrap(limiter);

	app.listen(config.port, () => {
		logger.info(`Environment: ${config.env}`);
		logger.info(`${config.apiName} listening on port ${config.port}`);
	});

	process.on("SIGINT", () => {
		logger.info("Shutting down OTLP client.");
		otlpSdk.shutdown().then(() => {
			logger.info("OTLP client shut down.");
			process.exit(0);
		});
	});
}

void main();
