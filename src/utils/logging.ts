import { createLogger, transports, format } from "winston";
import { store } from "../integrations/http/koa/middlewares/tracing";

const { colorize, combine, printf, timestamp } = format;

const msgFormat = combine(
	colorize(),
	timestamp(),
	printf(
		({ level, message, timestamp }) =>
			`${timestamp} [${level}] [${store.getStore() ?? "no-request"}]: ${message}`,
	),
);

export const logger = createLogger({
	level: "info",
	format: msgFormat,
	transports: [new transports.Console()],
});
