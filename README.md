![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tomkcey/koa-template/ci.yml?branch=master)

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
			"name": "Debug Koa API",
			"skipFiles": ["<node_internals>/**"],
			"program": "${workspaceFolder}/dist/index.js"
		}
	]
}
```

### Testcontainers

When you launch the jest runner, it will first setup some docker containers using testcontainers. Sometimes problems arise with those containers and you might want to see the logs. To output them in the terminal you can simply add `DEBUG=testcontainers*` before the `npm run test` command.

`DEBUG=testcontainers* npm run test`

## Notes

### Environment variables

All environment variables go in the `.env` file at root. However, for some tests it's important to override some of the values therein. That's why some of them are defined in `./src/test/setup-global.ts`

### Infrastructure

To bring the whole infrastructure up, you can either use the shell scripts in `./scripts/*.sh` individually, or the `docker-compose.yml` file with `docker compose up --build`.
