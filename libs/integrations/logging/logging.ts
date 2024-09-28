import { Logger } from "../../core/logging";
import { createLogger, format, transports, Logger as WinstonLogger } from "winston";

const { combine, timestamp, json } = format;

const masterLogger = createLogger({
	level: "info",
	format: combine(timestamp(), json({ space: 2 })),
	transports: [new transports.Console()],
});

export function getLogger(
	metadata: Record<string, unknown>,
	mutate: (logger: WinstonLogger) => WinstonLogger = (logger: WinstonLogger) => logger,
): Logger {
	const logger = mutate(masterLogger.child(metadata));

	return {
		info: logger.info.bind(logger),
		warn: logger.warn.bind(logger),
		error: logger.error.bind(logger),
		debug: logger.debug.bind(logger),
	};
}
