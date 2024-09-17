import { Command, program } from "commander";
import { createServer } from "http";
import { getLogger } from "../../libs/integrations/logging/logging";
import { getEnvironmentVariables } from "../../libs/integrations/environments/environments";
import { meter, opentelemetry, trace } from "../../libs/integrations/otlp/otlp";
import { constants } from "http2";
import { OTLPTransport } from "../../libs/integrations/logging/otlp";

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
				logsUrl: assert("OTLP_LOGS_URL", (url) => url),
			},
		};
	});

	// TELEMETRY
	const otlp = opentelemetry({
		apiName: secrets.appName,
		env: secrets.env,
		urls: {
			metrics: secrets.otlp.metricsUrl,
			traces: secrets.otlp.tracesUrl,
			logs: secrets.otlp.logsUrl,
		},
	});

	otlp.start();

	const metrics = meter(secrets.appName);

	// LOGGER
	const logger = getLogger({ app: secrets.appName, env: secrets.env }, (logger) =>
		logger.add(new OTLPTransport(secrets.otlp.logsUrl, { serviceName: secrets.appName })),
	);

	// PROGRAM STARTS
	await program
		.addCommand(
			new Command("serve").description("An example HTTP server.").action(() => {
				const reqCountGauge = metrics.createHistogram("http_request_duration_seconds");

				const s = createServer(async (req, res) => {
					const now = Date.now();
					logger.info("Received request.", { url: req.url, method: req.method });

					return trace(
						async () =>
							res.writeHead(constants.HTTP_STATUS_OK, { "Content-Type": "text/plain" }).end(),
						{ tracerName: secrets.appName, spanName: "serve" },
					).finally(() =>
						reqCountGauge.record(Date.now() - now, {
							route: req.url?.split("?").at(0),
							method: req.method,
							status: req.statusCode,
						}),
					);
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
