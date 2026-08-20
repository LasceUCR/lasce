# infra/docker

Everything needed to run the datastores locally, plus production images for the two applications.

## Start the datastores

```bash
pnpm services:up      # docker compose --env-file .env -f infra/docker/docker-compose.yml up -d
pnpm services:logs
pnpm services:down
```

| Service | Port | Notes |
| --- | --- | --- |
| PostgreSQL | 5432 | Schema owned by Prisma (`pnpm db:migrate`) |
| Redis | 6379 | Transport for the BullMQ queue |
| InfluxDB 3 Core | 8181 | Databases are created on first write |
| MinIO | 9000 (API), 9001 (console) | The bucket is created by the worker on first use |

The default `up` starts **only** these four. The usual loop is to run the app and the worker on the
host (`pnpm dev`, `pnpm worker:dev`) against them, which keeps hot reload fast.

## Run the applications in containers too

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml --profile apps up -d --build
```

`web` and `worker` sit behind the `apps` profile precisely so they stay out of the way during
day-to-day development. Inside the network the services address each other by name
(`postgres`, `redis`, `influxdb`, `minio`), which is why the compose file overrides the
`localhost` URLs from `.env`.

## InfluxDB authentication

The compose file sets `INFLUXDB3_WITHOUT_AUTH=true`. **This is for local development only.** It
exists so the stack works the moment it comes up — otherwise every fresh volume would need an admin
token minted and pasted into `.env` before a single point could be written.

For anything shared or deployed, drop that variable and mint a token:

```bash
docker compose -f infra/docker/docker-compose.yml exec influxdb influxdb3 create token --admin
```

Then put the value in `INFLUXDB_TOKEN`. For automated deployments InfluxDB also accepts a
pre-provisioned token file via `INFLUXDB3_ADMIN_TOKEN_FILE`.

## Images

- `web.Dockerfile` — multi-stage Node 22 build. Installs from the manifests first so the dependency
  layer survives source edits, generates the Prisma client, then builds Next.js in `standalone`
  mode. Because `outputFileTracingRoot` points at the repository root, the entry point inside the
  image is `apps/web/server.js`.
- `worker.Dockerfile` — based on the official `uv` image. Installs from `uv.lock` with
  `--frozen --no-dev`, so the image contains exactly what the lockfile pins and none of the test
  tooling.

Both expect the **repository root** as the build context.

## Running without Docker

Nothing here is required. If you would rather not install Docker, point the URLs in `.env` at a
PostgreSQL and a Redis you already have — those two are enough for the app and for any job that
does not touch time series or files. Add InfluxDB and MinIO (or any S3-compatible endpoint, which
is all the MinIO client needs) when you want `ingest-readings` and `process-file` to work.
