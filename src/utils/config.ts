import dotenv from "dotenv";

dotenv.config();

export const config = {
	apiName: ensureKey("API_NAME"),
	apiKey: ensureKey("API_KEY"),
	env: process.env.NODE_ENV ?? "development",
	port: process.env.PORT ?? 3000,
	rateLimit: {
		durationInMs: parseInt(ensureKey("RATE_LIMIT_DURATION_MS"), 10),
		nReq: parseInt(ensureKey("RATE_LIMIT_MAX_REQUESTS"), 10),
	},
	redis: { url: ensureKey("REDIS_URL") },
	pg: { url: ensureKey("PG_URL") },
	amqp: { url: ensureKey("AMQP_URL") },
	minio: {
		url: ensureKey("MINIO_URL"),
		port: ensureKey("MINIO_PORT"),
		accessKey: ensureKey("MINIO_ACCESS_KEY"),
		secretKey: ensureKey("MINIO_SECRET_KEY"),
	},
} as const;

function ensureKey(key: string): string {
	const v = process.env[key];
	if (!v) {
		throw new Error(`Missing required environment variable ${key}`);
	}
	return v;
}
