import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { trace as opentelemetryTrace } from "@opentelemetry/api";

interface OpenTelemetryConfig {
	env: string;
	apiName: string;
	otlpUrl: string;
	instrumentations?: Instrumentation[];
}

interface OpenTelemetryService {
	start(): void;
	shutdown(): Promise<void>;
}

export function opentelemetry(config: Readonly<OpenTelemetryConfig>): OpenTelemetryService {
	return new NodeSDK({
		serviceName: config.apiName,
		traceExporter: new OTLPTraceExporter({ url: config.otlpUrl }),
		metricReader: new PeriodicExportingMetricReader({
			exporter: new OTLPMetricExporter({ url: config.otlpUrl }),
		}),
		instrumentations: config.instrumentations,
	});
}

interface OpenTelemetryTracingConfig {
	tracerName: string;
	spanName: string;
}

export async function trace<R>(
	fn: () => Promise<R>,
	config: OpenTelemetryTracingConfig,
): Promise<R> {
	const tracer = opentelemetryTrace.getTracer(config.tracerName);
	return tracer.startActiveSpan(config.spanName, async (span) => {
		return fn().finally(() => span.end());
	});
}
