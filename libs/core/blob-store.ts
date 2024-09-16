import { Readable } from "stream";

export abstract class BaseBlobStore<C> {
	constructor(protected client: C) {}

	abstract upload(bucket: string, file: string, stream: Readable): Promise<void>;
	abstract download(bucket: string, file: string): Promise<Readable>;
}
