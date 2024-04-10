import { Client } from "minio";
import { Readable } from "stream";
import { FileStorageExecutor } from "./file-storage";
import { config } from "../../utils/config";

export class MinioFileStorage implements FileStorageExecutor {
	constructor(
		private readonly client: Client,
		private readonly bucket: string,
	) {}

	async upload(filename: string, stream: Readable): Promise<void> {
		await this.client.putObject(this.bucket, filename, stream);
	}

	async download(filename: string): Promise<Readable> {
		return this.client.getObject(this.bucket, filename);
	}

	async delete(filename: string): Promise<void> {
		await this.client.removeObject(this.bucket, filename);
	}
}

export namespace MinioFileStorage {
	export const BUCKETS = ["logs"] as const;

	export type Bucket = (typeof BUCKETS)[number];

	let client: Client | null = null;

	function getClient() {
		if (client) {
			return client;
		}

		client = new Client({
			accessKey: config.minio.accessKey,
			secretKey: config.minio.secretKey,
			endPoint: config.minio.url,
			port: 9000,
			useSSL: false,
		});
		return client;
	}

	let fileStorageMap = new Map<Bucket, MinioFileStorage | null>();

	export async function getFileStorage(bucket: Bucket) {
		const maybeFileStorage = fileStorageMap.get(bucket);
		if (maybeFileStorage) {
			return maybeFileStorage;
		}

		const client = getClient();

		const bucketExists = await client.bucketExists(bucket);
		if (!bucketExists) {
			await client.makeBucket(bucket);
		}

		const fileStorage = new MinioFileStorage(client, bucket);
		fileStorageMap.set(bucket, fileStorage);
		return fileStorage;
	}
}
