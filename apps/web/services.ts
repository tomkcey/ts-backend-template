import { BlobStore } from "../../libs/integrations/minio/minio";
import { Broker } from "../../libs/integrations/rabbitmq/rabbitmq";
import { PoolExecutor } from "../../libs/integrations/pg/pg";

const Queues = { work: ["work.a"] } as const;

interface Dependencies {
	rabbitmq: Broker<typeof Queues>;
	pg: PoolExecutor;
	minio: BlobStore;
}

// SERVICES
export class Service {
	constructor(private readonly deps: Dependencies) {}
}
