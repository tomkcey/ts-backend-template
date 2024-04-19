import { Client } from "minio";
import { Readable } from "stream";
import { config } from "../../utils/config";
import { isNil } from "../../utils/coersion";

export class Store {
	private client: Client | null = null;
	private buckets: Set<string> = new Set();

	private getClient(): Client {
		if (isNil(this.client)) {
			this.client = new Client({
				accessKey: config.minio.accessKey,
				secretKey: config.minio.secretKey,
				endPoint: config.minio.url,
				port: config.minio.port,
				useSSL: false,
			});
		}

		return this.client;
	}

	public async setupBucket(bucket: string): Promise<void> {
		if (this.buckets.has(bucket)) {
			return;
		}

		const client = this.getClient();
		const exists = await client.bucketExists(bucket);
		if (!exists) {
			await client.makeBucket(bucket);
			this.buckets.add(bucket);
		}
	}

	public async upload(
		filename: string,
		bucket: string,
		stream: Readable,
	): Promise<void> {
		const client = this.getClient();
		await this.setupBucket(bucket);
		await client.putObject(bucket, filename, stream);
	}

	public async download(filename: string, bucket: string): Promise<Readable> {
		const client = this.getClient();
		await this.setupBucket(bucket);
		return client.getObject(bucket, filename);
	}

	public async delete(filename: string, bucket: string): Promise<void> {
		const client = this.getClient();
		await this.setupBucket(bucket);
		await client.removeObject(bucket, filename);
	}
}
