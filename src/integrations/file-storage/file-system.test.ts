import { FileSystemStorage } from "./file-system";
import { rm, writeFile } from "fs/promises";
import { createReadStream } from "fs";
import path from "path";

async function setup(message: string, filename: string) {
	const testFilePath = path.join(__dirname, filename);

	await writeFile(testFilePath, Buffer.from(message));
	const readable = createReadStream(testFilePath);

	readable.on("end", () => rm(testFilePath));

	return { readable };
}

describe(FileSystemStorage.name, () => {
	afterEach(async () => {
		await FileSystemStorage.cleanup();
	});

	it("streams the file unto the file system and streams it back in memory", async () => {
		const dirPath = path.join(__dirname, "logs");
		const storage = await FileSystemStorage.getFileStorage(dirPath);

		const message = "test";
		const filename = "test.log";
		const { readable } = await setup(message, filename);

		await storage.upload(filename, readable);

		const data = storage.download(filename);

		const chunks: Buffer[] = [];
		for await (const chunk of data) {
			chunks.push(chunk);
		}

		expect(Buffer.concat(chunks).toString()).toEqual(message);
	});
});
