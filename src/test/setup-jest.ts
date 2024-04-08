import { rateLimiter } from "../middlewares/limiting";

beforeAll(async () => {
	process.env.NODE_ENV = "test";
});

afterEach(async () => {
	rateLimiter.clear();
});
