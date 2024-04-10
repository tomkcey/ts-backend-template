![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tomkcey/koa-template/ci.yml?branch=master)

### Roadmap

#### Priority legend

`L (Low), M (Medium), H (High)`

-   [L] OpenAPI
-   [L] Message TTL/Dead-Lettering on AMQP broker implementation
-   [M] Remove excess cruft in `pg.test.ts`; the entities can be simpler
-   [M] Investigate why only emitter or amqp test spit out the logs for the `disconnect()`
-   [L] Database sharding, Read replica
-   [M] Neo4J
-   [H] Docker Compose
-   [L] Investigate exactly which ports we need opened with Jaeger

### Notes

-   If you want to output logs for `testcontainers`, input `DEBUG=testcontainers*` before the test command.
-   Some environment variables are overriden for tests, see `src/test/setup-global.ts`
