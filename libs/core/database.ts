import { IStoppable } from "./types";

export abstract class BaseExecutor<Query = string, Row = unknown, Client = unknown>
	implements IStoppable
{
	constructor(protected client: Client) {}

	abstract execute(query: Query): Promise<Row>;
	abstract stop(): Promise<void>;
}

export abstract class AtomicExecutor<
	Query = string,
	Row = unknown,
	Client = unknown,
> extends BaseExecutor<Query, Row, Client> {
	abstract transaction<V>(fn: <C>(executor: C) => Promise<V>): Promise<V>;
}

export abstract class BaseDatabase<
	Output,
	Query = string,
	Row = unknown,
	Client extends BaseExecutor<Query, Row> = BaseExecutor<Query, Row>,
> {
	constructor(protected client: Client) {}

	protected abstract map(row: Row): Output;
	protected abstract unique(query: Query): Promise<Output>;
	protected abstract list(query: Query): Promise<Output[]>;
}

export interface Pagination {
	limit: number;
	offset: number;
}

export type DateFilter =
	| Date
	| { gt: Date }
	| { gte: Date }
	| { lt: Date }
	| { lte: Date }
	| ({ gt: Date } & { lte: Date })
	| ({ gt: Date } & { lt: Date })
	| ({ gte: Date } & { lte: Date })
	| ({ gte: Date } & { lt: Date });

export type SortDirection = "asc" | "desc";
