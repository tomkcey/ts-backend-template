![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tomkcey/ts-backend-template/ci.yml?branch=master)

## Notes

### Environment variables

All environment variables go in a `.env` file at root.

### Infrastructure

To bring the whole infrastructure up, you can use the `docker-compose.yml` file with `docker compose up --build`.

If you use Docker Compose, your url-like environment variables will most likely use the service name defined in the **docker-compose.yml** file as the host. For example, instead of some service with the usual url of `http://localhost:9000`, you'd use `http://some-service:9000`.

### 3rd Party Admin UI

The Docker Compose is setup to also expose Admin-like UIs for some services. Currently, those are RabbitMQ (`15672`), Jaeger (`16686`), Grafana (`3000`) and MinIO (`9000`). Normally, you should be able to reach them from your browser at localhost pointing to the ports defined in-between parenthese.
