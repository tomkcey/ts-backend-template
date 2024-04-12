import { otlpSdk } from "./utils/otlp";
import { logger } from "./utils/logging";
import { MaybePromise } from "./utils/async";
import { Cli } from "./integrations/cli/cli";
import { main as greeting } from "./functions/greeting";
import { KoaHttp } from "./integrations/http";
import { config } from "./utils/config";

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
							`Starting http server using provider ${opts.provider}`,
						);

						const http = KoaHttp.getKoaHttpServer();
						return http.start(port);
					}

					throw new Error(`Unsupported provider ${opts.provider}`);
				}),
		(command) =>
			command
				.name(Cli.CommandName.Function)
				.description("Execute a function")
				.option("-n, --name <name>", "Function to execute")
				.action(async (opts) => {
					logger.info("Received command to execute function");

					if (opts.name === Cli.FunctionName.Greeting) {
						logger.info(`Executing function ${opts.name}`);

						return greeting();
					}

					throw new Error(`Unsupported function ${opts.name}`);
				}),
	),
);
