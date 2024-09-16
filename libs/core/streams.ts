import { Transform, TransformCallback, TransformOptions } from "stream";

export function handleBackPressure(options?: TransformOptions) {
	return new Transform({
		transform(chunk: unknown, encoding: BufferEncoding, callback: TransformCallback) {
			const canContinue = this.push(chunk, encoding);
			if (!canContinue) {
				this.pause();
				this.once("drain", this.resume.bind(this));
			}
			callback();
		},
		...options,
	});
}
