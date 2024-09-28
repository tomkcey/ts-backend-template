import { createReadStream } from "fs";
import { BlobStore, TestBlobStore } from "./minio";
import { Client } from "minio";
import path from "path";

describe(BlobStore.name, () => {
	const client = new Client({
		accessKey: "localuser",
		secretKey: "localpass",
		endPoint: "localhost",
		port: 9000,
		useSSL: false,
	});
	const blobStore = new TestBlobStore(client);
	const PATH = path.resolve(__dirname, "minio.ts");
	const BUCKET = "bucket";
	const FILE = "file.ts";

	beforeEach(async () => blobStore.purgeBucket(BUCKET));

	it(blobStore.upload.name + "/" + blobStore.download.name, async () => {
		await blobStore.upload(BUCKET, FILE, createReadStream(PATH));

		const buckets = await blobStore.listBuckets();
		const files = await blobStore.listObjects(BUCKET);

		expect(buckets).toEqual([BUCKET]);
		expect(files).toEqual([FILE]);

		const readable = await blobStore.download(BUCKET, FILE);

		const remoteChunks: Buffer[] = [];
		for await (const chunk of readable) {
			remoteChunks.push(Buffer.from(chunk));
		}

		const localChunks: Buffer[] = [];
		for await (const chunk of createReadStream(PATH)) {
			localChunks.push(Buffer.from(chunk));
		}

		expect(Buffer.concat(remoteChunks)).toEqual(Buffer.concat(localChunks));
	});
});
