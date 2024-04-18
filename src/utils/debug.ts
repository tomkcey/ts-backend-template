import { Logger } from "winston";
import { logger as l } from "./logging";

export class Loggable {
	constructor(protected logger: Logger = l) {}

	protected format(message: string) {
		const id = "id" in this ? ` [${this.id}]` : "";
		const name = "name" in this ? ` (${this.name})` : "";

		return `${this.constructor.name}${id}${name} > ${message}`;
	}

	protected info(message: string) {
		this.logger.info(this.format(message));
	}

	protected error(message: string) {
		this.logger.error(this.format(message));
	}

	protected warn(message: string) {
		this.logger.warn(this.format(message));
	}
}

export class Debugabble extends Loggable {
	constructor(logger: Logger = l) {
		super(logger);
	}

	protected debug(message: string) {
		this.logger.debug(this.format(message));
	}
}
