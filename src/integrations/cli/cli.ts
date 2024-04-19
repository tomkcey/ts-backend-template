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

	public async run(...factories: ((command: Command) => Command)[]) {
		return factories.reduce((acc, cur) => acc.add(cur), this).parse();
	}
}
