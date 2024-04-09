import { GenericContainer, StartedTestContainer } from "testcontainers";
import { logger } from "../utils/logging";

class Orchestrator {
	private containers: Record<string, StartedTestContainer> = {};

	public async add(name: string, image: GenericContainer) {
		logger.info(`Starting container ${name}`);
		const container = await image.start();
		this.containers[name] = container;
	}

	public async stop() {
		for (const key in this.containers) {
			logger.info(`Stopping container ${key}`);
			await this.containers[key].stop();
		}
	}
}

export const orchestrator = new Orchestrator();

export async function sleep(ms: number) {
	await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
