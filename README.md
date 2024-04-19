![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tomkcey/ts-backend-template/ci.yml?branch=master)

## Debugging

### VS Code Debugger

In your `.vscode/launch.json` you can copy and paste the following block. It should work right out of the box.

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"type": "node",
			"request": "launch",
			"name": "Debug Koa Server",
			"skipFiles": ["<node_internals>/**"],
			"program": "${workspaceFolder}/dist/index.js",
			"args": ["serve"],
			"preLaunchTask": "npm: build",
			"outputCapture": "std"
		},
		{
			"type": "node",
			"request": "launch",
			"name": "Debug function Function",
			"skipFiles": ["<node_internals>/**"],
			"program": "${workspaceFolder}/dist/index.js",
			"args": ["function", "-n", "function"],
			"preLaunchTask": "npm: build",
			"outputCapture": "std"
		}
	]
}
```

In your `.vscode/task.json` you can copy and paste the following block. It should work right out of the box.

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "npm: build",
			"type": "npm",
			"script": "build",
			"group": "build",
			"problemMatcher": [],
			"detail": "tsc"
		}
	]
}
```

## Notes

### Environment variables

All environment variables go in the `.env` file at root. However, for some tests it's important to override some of the values therein. That's why some of them are defined in `./src/test/setup-global.ts`

### Infrastructure

To bring the whole infrastructure up, you can either use the shell scripts in `./scripts/*.sh` individually, or the `docker-compose.yml` file with `docker compose up --build`.

If you use Docker Compose, your url-like environment variables will most likely use the service name defined in the **docker-compose.yml** file as the host. For example, instead of some service with the usual url of `http://localhost:9000`, you'd use `http://some-service:9000`.

### Tests

When you launch the [jest](https://jestjs.io/) runner, it will first setup some docker containers using **testcontainers**. Sometimes problems arise with those containers and you might want to see the logs. To output them in the terminal you can simply add `DEBUG=testcontainers*` before the `npm run test` command.

`DEBUG=testcontainers* npm run test`

Not all tests require external dependencies. To run tests without having to spin up containers for these dependencies, use the `npm run test:nosetup` npm script.

If you want only a select dependency, you can use the following environment variables to skip any of your choosing by setting it to false, or commenting it out temporarily.

```.env
ENABLE_TEST_RABBITMQ_CONTAINER=true
ENABLE_TEST_MINIO_CONTAINER=true
ENABLE_TEST_REDIS_CONTAINER=true
ENABLE_TEST_POSTGRES_CONTAINER=true
```

Also, the logger is set to `debug` level by default. If you want to silence the logs, you can set the `NODE_ENV` to _test_ and `DEBUG_TEST` to _false_. Notice that in the `package.json` the test commands already set the environent to _test_.

### 3rd Party Admin UI

The Docker Compose, as well as the docker containers in the shell scripts, are setup to also expose Admin-like user interfaces for some services. Currently, those are RabbitMQ (`15672`), Jaeger (`16686`) and MinIO (`9000`). Normally, you should be able to reach them from your browser at localhost pointing to the ports defined in-between parenthese.
