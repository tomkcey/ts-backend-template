import { Command, program } from "commander";
import { config } from "../../utils/config";
import { KoaHttp } from "../http";
import { main } from "../../functions/greeting";

enum CommandName {
	Serve = "serve",
	Function = "function",
}

enum ServeProvider {
	Koa = "koa",
}

enum FunctionName {
	Greeting = "greeting",
}

export class Cli {
	protected p: Command = program;

	public command(command: Command) {
		this.p.addCommand(command);
		return this;
	}

	public async parse() {
		await this.p.parseAsync(process.argv);
	}
}

export namespace Cli {
	let cli: Cli | null = null;

	export function getCli() {
		if (!cli) {
			cli = new Cli()
				.command(
					new Command(CommandName.Serve)
						.description("Start the server")
						.option("-p, --port <port>", "Port to listen on")
						.option(
							"--provider <provider>",
							"Provider to use (Koa)",
						)
						.action(async (opts) => {
							const port = opts.port ?? config.port;
							process.env.PORT = port.toString();

							switch (opts.provider) {
								case ServeProvider.Koa: {
									const http = KoaHttp.getKoaHttpServer();
									return http.start(port);
								}
								default:
									throw new Error(
										`Unsupported provider ${opts.provider}`,
									);
							}
						}),
				)
				.command(
					new Command(CommandName.Function)
						.description("Execute a function")
						.option("-n, --name <name>", "Function to execute")
						.action(async (opts) => {
							switch (opts.name) {
								case FunctionName.Greeting:
									return main();
								default:
									throw new Error(
										`Unsupported function ${opts.name}`,
									);
							}
						}),
				);
		}
		return cli;
	}

	export async function run() {
		const cli = getCli();
		return cli.parse();
	}
}
