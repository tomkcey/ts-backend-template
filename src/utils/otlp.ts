import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { KoaInstrumentation } from "@opentelemetry/instrumentation-koa";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { config } from "./config";

export const otlpSdk = (() => {
	if (config.env === "test") {
		return { start() {}, async shutdown() {} };
	}

	return new NodeSDK({
		serviceName: config.apiName,
		traceExporter: new OTLPTraceExporter(),
		metricReader: new PeriodicExportingMetricReader({
			exporter: new OTLPMetricExporter(),
		}),
		instrumentations: [new HttpInstrumentation(), new KoaInstrumentation()],
	});
})();

otlpSdk.start();
