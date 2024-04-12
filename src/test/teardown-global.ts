import { orchestrator } from "./utils";

export default async function teardown() {
	if (process.argv.includes("--no-setup")) {
		return;
	}

	await orchestrator.stop();
}
