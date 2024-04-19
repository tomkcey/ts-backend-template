import dotenv from "dotenv";

dotenv.config();

export const config = {
	apiName: ensureKey("API_NAME"),
	apiKey: ensureKey("API_KEY"),
	env: process.env.NODE_ENV ?? "dev",
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
		port: parseInt(ensureKey("MINIO_PORT"), 10),
		accessKey: ensureKey("MINIO_ACCESS_KEY"),
		secretKey: ensureKey("MINIO_SECRET_KEY"),
	},
	otlp: {
		otlpUrl: process.env.OTLP_URL,
	},
} as const;

function ensureKey(key: string): string {
	const v = process.env[key];
	if (!v) {
		throw new Error(`Missing required environment variable '${key}'`);
	}
	return v;
}
