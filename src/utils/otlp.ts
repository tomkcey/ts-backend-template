import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { KoaInstrumentation } from "@opentelemetry/instrumentation-koa";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { AmqplibInstrumentation } from "@opentelemetry/instrumentation-amqplib";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { RedisInstrumentation } from "@opentelemetry/instrumentation-redis-4";
import { config } from "./config";

export const otlpSdk = (() => {
	if (config.env === "test") {
		return { start() {}, async shutdown() {} };
	}

	return new NodeSDK({
		serviceName: config.apiName,
		traceExporter: new OTLPTraceExporter({ url: config.otlp.otlpUrl }),
		metricReader: new PeriodicExportingMetricReader({
			exporter: new OTLPMetricExporter({ url: config.otlp.otlpUrl }),
		}),
		instrumentations: [
			new HttpInstrumentation(),
			new KoaInstrumentation(),
			new AmqplibInstrumentation(),
			new PgInstrumentation(),
			new RedisInstrumentation(),
		],
	});
})();

otlpSdk.start();
