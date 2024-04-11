import { constants } from "http2";
import Koa from "koa";

export abstract class ServerError extends Error {
	constructor(
		message: string,
		public code: number,
		public details: unknown = null,
	) {
		super(message);
		this.name = this.constructor.name;
	}

	public httpRespond(res: Koa.Response): Koa.Response {
		res.status = this.code;
		res.body = {
			error: this.name,
			message: this.message,
			details: this.details,
		};
		return res;
	}
}

export class UnauthorizedError extends ServerError {
	private static readonly code = constants.HTTP_STATUS_UNAUTHORIZED;

	constructor(details?: unknown) {
		super("Unauthorized", UnauthorizedError.code, details);
	}
}

export class InternalServerError extends ServerError {
	private static readonly code = constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
	constructor(details?: unknown) {
		super("Internal Server Error", InternalServerError.code, details);
	}
}

export class TooManyRequestsError extends ServerError {
	private static readonly code = constants.HTTP_STATUS_TOO_MANY_REQUESTS;
	constructor(details?: unknown) {
		super("Too Many Requests", TooManyRequestsError.code, details);
	}
}

export class NotFoundError extends ServerError {
	private static readonly code = constants.HTTP_STATUS_NOT_FOUND;
	constructor(details?: unknown) {
		super("Not Found", NotFoundError.code, details);
	}
}

export class BadRequestError extends ServerError {
	private static readonly code = constants.HTTP_STATUS_BAD_REQUEST;
	constructor(details?: unknown) {
		super("Bad Request", BadRequestError.code, details);
	}
}

export function isServerError(error: unknown): error is ServerError {
	return error instanceof ServerError;
}
