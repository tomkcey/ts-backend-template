import { randomBytes } from "crypto";

export function randomHex(byteCount: number = 3) {
	return randomBytes(byteCount).toString("hex");
}
