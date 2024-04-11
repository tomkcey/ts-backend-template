import { MaybePromise } from "../../utils/async";

export type Method = "get" | "post" | "put" | "patch" | "delete";

export type Handler<TReq, TRes> = (
	request: TReq,
	response: TRes,
) => Promise<TRes>;

export type Middleware<TReq, TRes, TNext> = (
	request: TReq,
	response: TRes,
	next: TNext,
) => Promise<void>;

export interface Http<T, U, V> {
	createController(
		url: string,
		method: Method,
		handler: Handler<T, U>,
	): Http<T, U, V>;
	middleware(handler: Middleware<T, U, V>): Http<T, U, V>;
	start(port: number): MaybePromise<void>;
}
