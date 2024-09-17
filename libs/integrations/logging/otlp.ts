import TransportSream from "winston-transport";
import {
	LogRecordProcessor,
	BatchLogRecordProcessor,
	LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";

type Options = TransportSream.TransportStreamOptions;

export class OTLPTransport extends TransportSream {
	protected readonly exporter: OTLPLogExporter;
	protected readonly provider: LoggerProvider;
	protected readonly processor: LogRecordProcessor;

	constructor(
		readonly url: string,
		readonly opts?: Options & { serviceName?: string },
	) {
		super(opts);
		this.exporter = new OTLPLogExporter({ url: url + "/v1/logs" });
		this.provider = new LoggerProvider({
			resource: new Resource({ [ATTR_SERVICE_NAME]: opts?.serviceName }),
		});
		this.processor = new BatchLogRecordProcessor(this.exporter, {
			exportTimeoutMillis: 1000 * 10,
			scheduledDelayMillis: 1000 * 5,
		});
		this.provider.addLogRecordProcessor(this.processor);
	}

	log(info: any, next: () => void) {
		const logger = this.provider.getLogger(this.opts?.serviceName ?? "unknown");

		const { level, message, timestamp, ...metadata } = info;

		logger.emit({
			severityText: level,
			body: message,
			attributes: metadata,
			timestamp: timestamp ? new Date(timestamp).getTime() : Date.now(),
		});

		next();
	}
}
