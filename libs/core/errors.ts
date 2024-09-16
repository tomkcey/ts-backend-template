export abstract class BaseError<TCode = number, TContext = unknown> extends Error {
	constructor(
		message: string,
		public code: TCode,
		public ctx?: TContext,
	) {
		super(message);
	}

	public throw(): never {
		throw this;
	}

	public abstract log(): void;
}

export function isError(input: unknown): input is BaseError {
	return input instanceof BaseError;
}
