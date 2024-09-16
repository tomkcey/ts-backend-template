import dotenv from "dotenv";

function ensureEnv<V>(key: string, map: (value: string) => V): V {
	const value = process.env[key];
	if (value === undefined || value === null) {
		throw new Error(`Missing environment variable ${key}`);
	}

	return map(value);
}

function passthroughEnv<V>(key: string, map: (value?: string) => V | undefined): V | undefined {
	const value = process.env[key] ?? undefined;

	return map(value);
}

export function getEnvironmentVariables<R>(
	fn: (
		assert: <V>(key: string, map: (value: string) => V) => V,
		passthrough: <W>(key: string, map: (value?: string) => W | undefined) => W | undefined,
	) => R,
): R {
	dotenv.config();
	return fn(ensureEnv, passthroughEnv);
}
