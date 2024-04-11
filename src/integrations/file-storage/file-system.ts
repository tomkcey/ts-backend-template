import { Readable } from "stream";
import { FileStorageExecutor } from "./file-storage";
import { MaybePromise } from "../../utils/async";
import { writeFile, rm, mkdir, opendir } from "fs/promises";
import { createReadStream } from "fs";

export class FileSystemStorage implements FileStorageExecutor {
	constructor(private readonly directory: string) {}

	public async upload(filename: string, stream: Readable): Promise<void> {
		return writeFile(`${this.directory}/${filename}`, stream);
	}

	public download(filename: string): Readable {
		return createReadStream(`${this.directory}/${filename}`);
	}

	public delete(filename: string): MaybePromise<void> {
		return rm(`${this.directory}/${filename}`);
	}
}

export namespace FileSystemStorage {
	let fileStorageMap = new Map<string, FileSystemStorage | null>();

	export async function getFileStorage(directory: string) {
		const maybeFileStorage = fileStorageMap.get(directory);
		if (maybeFileStorage) {
			return maybeFileStorage;
		}

		const dirExists = await opendir(directory)
			.then((handle) => handle.close().then(() => true))
			.catch(() => false);

		if (!dirExists) {
			await mkdir(directory);
		}

		const fileStorage = new FileSystemStorage(directory);
		fileStorageMap.set(directory, fileStorage);
		return fileStorage;
	}

	export async function cleanup() {
		for (const directory of fileStorageMap.keys()) {
			await rm(directory, { recursive: true });
			fileStorageMap.delete(directory);
		}
	}
}
