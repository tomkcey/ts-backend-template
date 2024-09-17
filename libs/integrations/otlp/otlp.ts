import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
	trace as opentelemetryTrace,
	metrics as opentelemetryMetrics,
	Meter,
} from "@opentelemetry/api";

interface OpenTelemetryConfig {
	env: string;
	apiName: string;
	urls: { metrics: string; traces: string };
	instrumentations?: Instrumentation[];
}

interface OpenTelemetryService {
	start(): void;
	shutdown(): Promise<void>;
}

export function opentelemetry(config: Readonly<OpenTelemetryConfig>): OpenTelemetryService {
	const traceExporter = new OTLPTraceExporter({ url: config.urls.traces + "/v1/traces" });

	const metricExporter = new OTLPMetricExporter({ url: config.urls.metrics + "/v1/metrics" });
	const metricReader = new PeriodicExportingMetricReader({
		exporter: metricExporter,
		exportIntervalMillis: 1000 * 5,
	});

	const sampler = new TraceIdRatioBasedSampler(0.75);

	return new NodeSDK({
		traceExporter,
		metricReader,
		sampler,
		serviceName: config.apiName,
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
	const span = tracer.startSpan(config.spanName);
	return fn()
		.catch((error) => {
			span.recordException(error);
			throw error;
		})
		.finally(() => span.end());
}

export function meter(name: string): Meter {
	return opentelemetryMetrics.getMeter(name, "0.1.0");
}
