import { Client } from "minio";
import { Readable } from "stream";
import { BaseBlobStore } from "../../core/blob-store";

export class BlobStore extends BaseBlobStore<Client> {
	constructor(client: Client) {
		super(client);
	}

	public async upload(bucket: string, file: string, stream: Readable): Promise<void>;
	public async upload(bucket: string, file: string, stream: Buffer): Promise<void>;
	public async upload(bucket: string, file: string, stream: Readable | Buffer): Promise<void> {
		await this.client.putObject(bucket, file, stream);
	}

	public async download(bucket: string, file: string): Promise<Readable> {
		return this.client.getObject(bucket, file);
	}
}
