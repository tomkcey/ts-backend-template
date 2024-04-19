import { Store } from "./minio";
import { writeFile } from "fs/promises";
import { createReadStream } from "fs";
import path from "path";

describe(Store.name, () => {
	const store = new Store();

	it("streams the file unto the bucket and streams it back in memory", async () => {
		const message = "test";
		const filename = "test.log";

		await writeFile(path.join(__dirname, filename), Buffer.from(message));

		const readable = createReadStream(path.join(__dirname, filename));

		await store.upload(filename, "logs", readable);

		const data = await store.download(filename, "logs");

		const chunks: Buffer[] = [];
		for await (const chunk of data) {
			chunks.push(chunk);
		}

		expect(Buffer.concat(chunks).toString()).toEqual(message);
	});
});
