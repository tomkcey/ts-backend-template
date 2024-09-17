import { Command, program } from "commander";
import { createServer } from "http";
import { getLogger } from "../../libs/integrations/logging/logging";
import { getEnvironmentVariables } from "../../libs/integrations/environments/environments";
import { meter, opentelemetry, trace } from "../../libs/integrations/otlp/otlp";
import { ValueType } from "@opentelemetry/api";
import { constants } from "http2";

async function main() {
	// ENVIRONMENT VARIABLES
	const secrets = getEnvironmentVariables((assert) => {
		return {
			env: assert("NODE_ENV", (env) => env),
			appName: assert("APP_NAME", (appName) => appName),
			port: assert("PORT", (port) => port),
			// otlpUrl: assert("OTLP_URL", (url) => url),
			otlp: {
				metricsUrl: assert("OTLP_METRICS_URL", (url) => url),
				tracesUrl: assert("OTLP_TRACES_URL", (url) => url),
			},
		};
	});

	// TELEMETRY
	const otlp = opentelemetry({
		apiName: secrets.appName,
		env: secrets.env,
		urls: { metrics: secrets.otlp.metricsUrl, traces: secrets.otlp.tracesUrl },
	});

	otlp.start();

	// METRICS
	const m = meter(secrets.appName);
	const gauge = m.createGauge("example_gauge", { valueType: ValueType.INT });
	const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

	const interval = setInterval(() => {
		gauge.record(random(0, 10));
	}, 5000);

	// LOGGER
	const logger = getLogger({ app: secrets.appName, env: secrets.env });

	// PROGRAM STARTS
	await program
		.addCommand(
			new Command("serve").description("An example HTTP server.").action(() => {
				const s = createServer(async (_, res) => {
					logger.info("Received request.");

					return trace(
						async () =>
							res.writeHead(constants.HTTP_STATUS_OK, { "Content-Type": "text/plain" }).end(),
						{ tracerName: secrets.appName, spanName: "serve" },
					);
				});

				s.listen(secrets.port, () => logger.info(`Listening on ${secrets.port}.`));

				process.on("SIGTERM", () => {
					logger.info("Received SIGTERM. Closing server.");
					s.close();
					clearInterval(interval);
				});
			}),
		)
		.parseAsync(process.argv);
}

void main();
