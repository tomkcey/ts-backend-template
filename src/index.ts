import { app } from "./app";
import { config } from "./utils/config";
import { logger } from "./utils/logging";

app.listen(config.port, () => {
	logger.info(`Environment: ${config.env}`);
	logger.info(`Server listening on port ${config.port}`);
});
