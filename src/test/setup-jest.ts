import { rateLimiter } from "../middlewares/limiting";

beforeAll(async () => {
	process.env.NODE_ENV = "test";
});

afterEach(() => rateLimiter.clear());
