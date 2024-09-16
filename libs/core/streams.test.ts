import { createReadStream, createWriteStream } from "fs";
import { rm, writeFile } from "fs/promises";
import path from "path";
import { handleBackPressure } from "./streams";

const ONE_MB = 1024 * 1024;
const PATH_IN = path.resolve(__dirname, "dummy.log");
const PATH_OUT = path.resolve(__dirname, "dummy.logx");

function createDummyBuffer(fileSizeMb: number) {
	return Buffer.alloc(fileSizeMb, 0, "binary");
}

async function createDummyFile(path: string, buffer: Buffer) {
	return writeFile(path, buffer);
}

describe(handleBackPressure.name, () => {
	beforeEach(async () => {
		await createDummyFile(PATH_IN, createDummyBuffer(ONE_MB));
	});

	afterEach(async () => {
		await rm(PATH_IN, { force: true });
		await rm(PATH_OUT, { force: true });
	});

	it("will pause to drain the internal buffer and then resume", async () => {
		const READER_HWTRMRK_MUL = 20;
		const WRITER_HWTRMRK_MUL = 100;
		const TRANSFORM_HWTRMRK_MUL = 50;

		const fn = jest.fn();

		await new Promise((resolve) => {
			const reader = createReadStream(PATH_IN, {
				encoding: "binary",
				highWaterMark: Math.ceil(ONE_MB / READER_HWTRMRK_MUL),
			});
			const writer = createWriteStream(PATH_OUT, {
				encoding: "binary",
				highWaterMark: Math.ceil(ONE_MB / WRITER_HWTRMRK_MUL),
			});
			const transform = handleBackPressure({
				highWaterMark: Math.ceil(ONE_MB / TRANSFORM_HWTRMRK_MUL),
			});

			writer.on("drain", fn);
			writer.on("close", resolve);

			reader.pipe(transform).pipe(writer);
		});

		expect(fn).toHaveBeenCalledTimes(READER_HWTRMRK_MUL);
	});
});
