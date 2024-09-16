interface LogContext {
	[key: string]: unknown;
	correlationId?: string;
	serviceName?: string;
}

interface Write {
	(message: string, ctx?: LogContext): void;
}

export interface Logger {
	info: Write;
	error: Write;
	warn: Write;
	debug: Write;
}

type LogLevel = keyof Logger;

interface LogFormat<T extends LogContext = LogContext> {
	timestamp: string;
	level: LogLevel;
	message: string;
	ctx?: T;
}

export namespace Logger {
	function formatLog(level: LogLevel, message: string, ctx?: LogContext): LogFormat {
		return {
			timestamp: new Date().toISOString(),
			level,
			message,
			ctx,
		};
	}

	export function getDefaultLogger(): Logger {
		return {
			info: (message, ctx = {}) => {
				const formattedMessage = formatLog("info", message, ctx);
				console.info(JSON.stringify(formattedMessage, null, 2));
			},
			debug: (message, ctx = {}) => {
				const formattedMessage = formatLog("info", message, ctx);
				console.debug(JSON.stringify(formattedMessage, null, 2));
			},
			error: (message, ctx = {}) => {
				const formattedMessage = formatLog("info", message, ctx);
				console.error(JSON.stringify(formattedMessage, null, 2));
			},
			warn: (message, ctx = {}) => {
				const formattedMessage = formatLog("info", message, ctx);
				console.warn(JSON.stringify(formattedMessage, null, 2));
			},
		};
	}
}
