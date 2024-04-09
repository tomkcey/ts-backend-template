import { orchestrator } from "./utils";

export default async function teardown() {
	await orchestrator.stop();
}
