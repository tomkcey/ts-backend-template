export abstract class Result<
	V = unknown,
	E extends Error = Error,
	C extends new (message: string) => E = new (message: string) => E,
> {
	public static ok<V>(result: Result<V>): result is Success<V> {
		return result instanceof Success;
	}

	public static err<
		E extends Error = Error,
		C extends new (message: string) => E = new (message: string) => E,
	>(result: Result): result is Failure<E, C> {
		return result instanceof Failure;
	}

	public ok(): this is Success<V> {
		return this instanceof Success;
	}

	public err(): this is Failure<E, C> {
		return this instanceof Failure;
	}
}

export class Failure<E extends Error, C extends new (message: string) => E> extends Result<
	never,
	E,
	C
> {
	constructor(
		private reason: string,
		private errConstructor?: C,
	) {
		super();
	}

	public unwrap(): string {
		return this.reason;
	}

	public throw(): never {
		throw new (this.errConstructor ?? Error)(this.reason);
	}
}

export class Success<V> extends Result<V> {
	constructor(private value: V) {
		super();
	}

	public unwrap(): V {
		return this.value;
	}
}
