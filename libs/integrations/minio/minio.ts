import { BucketItem, Client } from "minio";
import { Readable } from "stream";
import { BaseBlobStore } from "../../core/blob-store";
import { isNotNil } from "../../core/coersion";

export class BlobStore extends BaseBlobStore<Client> {
	constructor(client: Client) {
		super(client);
	}

	public async upload(bucket: string, file: string, stream: Readable): Promise<void>;
	public async upload(bucket: string, file: string, stream: Buffer): Promise<void>;
	public async upload(bucket: string, file: string, stream: Readable | Buffer): Promise<void> {
		const exists = await this.client.bucketExists(bucket);
		if (!exists) {
			await this.client.makeBucket(bucket);
		}

		await this.client.putObject(bucket, file, stream);
	}

	public async download(bucket: string, file: string): Promise<Readable> {
		const exists = await this.client.bucketExists(bucket);
		if (!exists) {
			throw new Error("Bucket does not exist");
		}

		return this.client.getObject(bucket, file);
	}
}

export class TestBlobStore extends BlobStore {
	constructor(client: Client) {
		super(client);
	}

	public async listBuckets(): Promise<string[]> {
		const buckets = await this.client.listBuckets();
		return buckets.map((bucket) => bucket.name);
	}

	public async listObjects(bucket: string): Promise<string[]> {
		const exists = await this.client.bucketExists(bucket);
		if (!exists) {
			throw new Error("Bucket does not exist");
		}

		const files: string[] = [];
		for await (const file of this.client.listObjects(bucket)) {
			const fileName = (file as BucketItem).name;
			if (isNotNil(fileName)) {
				files.push(fileName);
			}
		}
		return files;
	}

	public async purgeBucket(bucket: string) {
		const exists = await this.client.bucketExists(bucket);
		if (!exists) {
			return;
		}

		const files = await this.listObjects(bucket);
		for (const file of files) {
			await this.client.removeObject(bucket, file);
		}
	}
}
