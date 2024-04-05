import dotenv from "dotenv";

dotenv.config();

export const config = {
	apiKey: ensureKey("API_KEY"),
	env: process.env.NODE_ENV ?? "development",
	port: process.env.PORT ?? 3000,
	rateLimit: {
		duration: parseInt(ensureKey("RATE_LIMIT_DURATION_MS"), 10),
		nReq: parseInt(ensureKey("RATE_LIMIT_MAX_REQUESTS"), 10),
	},
} as const;

function ensureKey(key: string): string {
	const v = process.env[key];
	if (!v) {
		throw new Error(`Missing required environment variable ${key}`);
	}
	return v;
}
