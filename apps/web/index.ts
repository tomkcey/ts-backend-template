import { Command, program } from "commander";
import { createServer } from "http";
import { constants } from "http2";
import { getLogger } from "../../libs/integrations/logging/logging";
import { getEnvironmentVariables } from "../../libs/integrations/environments/environments";
import { opentelemetry, trace } from "../../libs/integrations/otlp/otlp";

async function main() {
	// ENVIRONMENT VARIABLES
	const secrets = getEnvironmentVariables((assert) => {
		return {
			env: assert("NODE_ENV", (env) => env),
			appName: assert("APP_NAME", (appName) => appName),
			port: assert("PORT", (port) => port),
			otlpUrl: assert("OTLP_URL", (url) => url),
		};
	});

	// TELEMETRY
	const otlp = opentelemetry({
		apiName: secrets.appName,
		env: secrets.env,
		otlpUrl: secrets.otlpUrl,
	});

	otlp.start();

	// LOGGER
	const logger = getLogger({ app: secrets.appName, env: secrets.env });

	// PROGRAM STARTS
	await program
		.addCommand(
			new Command("serve").description("An example HTTP server.").action(() => {
				const s = createServer(async (_req, res) => {
					logger.info("Received request.");
					const response = await trace(
						async () => res.writeHead(constants.HTTP_STATUS_OK, { "Content-Type": "text/plain" }),
						{ spanName: "http-call", tracerName: "http-tracer" },
					);
					return response.end();
				});

				s.listen(secrets.port, () => logger.info(`Listening on ${secrets.port}.`));

				process.on("SIGTERM", () => {
					logger.info("Received SIGTERM. Closing server.");
					s.close();
				});
			}),
		)
		.parseAsync(process.argv);
}

void main();
