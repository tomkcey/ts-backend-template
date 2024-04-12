import { Command, program } from "commander";

export class Cli {
	constructor(protected p: Command = program) {}

	public add(factory: (command: Command) => Command) {
		this.p.addCommand(factory(new Command()));
		return this;
	}

	public async parse() {
		await this.p.parseAsync(process.argv);
	}
}

export namespace Cli {
	export enum CommandName {
		Serve = "serve",
		Function = "function",
	}

	export enum ServeProvider {
		Koa = "koa",
	}

	export enum FunctionName {
		Greeting = "greeting",
	}

	let cli: Cli | null = null;

	export function getCli() {
		if (!cli) {
			cli = new Cli();
		}
		return cli;
	}

	export async function run(...factories: ((command: Command) => Command)[]) {
		const cli = getCli();
		return factories.reduce((acc, cur) => acc.add(cur), cli).parse();
	}
}
