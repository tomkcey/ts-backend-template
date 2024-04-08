import { orchestrator } from "./utils";

export default async function setup() {
	await orchestrator.stop();
}
