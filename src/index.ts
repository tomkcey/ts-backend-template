import { otlpSdk } from "./utils/otlp";
import { logger } from "./utils/logging";
import { MaybePromise } from "./utils/async";
import { Cli } from "./integrations/cli/cli";
import { main as func } from "./functions/function";
import { KoaHttp, middlewares } from "./integrations/http";
import { config } from "./utils/config";
import { InMemoryCache } from "./integrations/cache";
import { constants } from "http2";
import { executionTime } from "./utils/time";

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

void main(() =>
	Cli.run(
		(command) =>
			command
				.name(Cli.CommandName.Serve)
				.description("Start the server")
				.option("-p, --port <port>", "Port to listen on")
				.option("--provider <provider>", "Provider to use (Koa)")
				.action(async (opts) => {
					logger.info("Received command to start server.");

					const port = opts.port ?? config.port;
					process.env.PORT = port.toString();

					if (opts.provider === Cli.ServeProvider.Koa) {
						logger.info(
							`Starting http server using provider '${opts.provider}'`,
						);

						return KoaHttp.getKoaHttpServer(
							middlewares.trace,
							middlewares.log,
							middlewares.error,
							middlewares.auth,
							async (req, res, next) =>
								middlewares.RateLimiter.withCache(
									new InMemoryCache(),
								).middleware(req, res, next),
						)
							.createController("/ping", "get", async (_, res) =>
								KoaHttp.withResponse(res)
									.status(constants.HTTP_STATUS_OK)
									.body("pong")
									.headers({ "Content-Type": "text/plain" })
									.build(),
							)
							.start(port);
					}

					throw new Error(`Unsupported provider '${opts.provider}'`);
				}),
		(command) =>
			command
				.name(Cli.CommandName.Function)
				.description("Execute a function")
				.option("-n, --name <name>", "Function to execute")
				.action(async (opts) => {
					logger.info("Received command to execute function");

					const { timeInMs } = await executionTime(async () => {
						if (opts.name === Cli.FunctionName.Function) {
							logger.info(`Executing function '${opts.name}'`);

							return func();
						}

						throw new Error(`Unsupported function '${opts.name}'`);
					});

					logger.info(
						`Function '${opts.name}' took ${timeInMs}ms to complete`,
					);
				}),
	),
);
