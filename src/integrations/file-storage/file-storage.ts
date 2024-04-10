import { Readable } from "stream";
import { MaybePromise } from "../../utils/async";

export interface FileStorageExecutor<T = string> {
	upload(filename: T, stream: Readable): MaybePromise<void>;
	download(filename: T): MaybePromise<Readable>;
	delete(filename: T): MaybePromise<void>;
}
