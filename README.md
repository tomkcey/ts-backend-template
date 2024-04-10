![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tomkcey/koa-template/ci.yml?branch=master)

### Roadmap

#### Priority legend

`L (Low), M (Medium), H (High)`

-   [L] OpenAPI
-   [L] Message TTL/Dead-Lettering on AMQP broker implementation
-   [M] Remove excess cruft in `pg.test.ts`; the entities can be simpler
-   [M] Investigate why only emitter or amqp test spit out the logs for the `disconnect()`
-   [L] Investigate exactly which ports we need opened with Jaeger
-   [L] Database sharding, Read replica
-   [M] Neo4J
-   [L] Kubernetes instead-of/with docker-compose, as is or with Tilt?
-   [L] Investigate environemnt variables for PostgreSQL for targeting a specific database, but it has to be created on container startup otherwise nodejs client connection won't work
-   [H] File system file-storage implementation

### Notes

-   If you want to output logs for `testcontainers`, input `DEBUG=testcontainers*` before the test command.
-   Some environment variables are overriden for tests, see `src/test/setup-global.ts`
-   If you want to bring up the whole infrastructure for testing locally, you can use `docker compose up --build`
