# infra/coolify

The deployed stack and the one-time setup behind it. How a release flows through it is in
[`docs/deployment.md`](../../docs/deployment.md); this file is the runbook for building an
environment from nothing.

| File          | What it is                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------- |
| `compose.yml` | One environment: Postgres, Redis, InfluxDB 3, MinIO, `migrate`, `web`, `worker`. No builds. |

## Hosts

| Host             | Role                                                                               |
| ---------------- | ---------------------------------------------------------------------------------- |
| `172.16.49.26`   | Coolify (`:8000`) and both environments. Public as `163.178.171.26`, ports 80/443. |
| `172.16.202.224` | Jump host and the self-hosted GitHub Actions runner (`lasce-coolify`).             |

Both are on the UCR private network. Connect to the VPN first. `172.16.49.26` is reachable only
through the jump host, and cannot open connections back to the `172.16.202.x` subnet, which is
why it is the only server Coolify manages.

## 1. SSH access

Log in with keys, never the shared password. Once per workstation:

```bash
ssh-keygen -t ed25519
ssh-copy-id admin@172.16.202.224
```

`~/.ssh/config`:

```
Host lasce-jump
  HostName 172.16.202.224
  User admin

Host lasce-coolify
  HostName 172.16.49.26
  User lasce-ops
  ProxyJump lasce-jump
```

`lasce-ops` on `172.16.49.26` exists only to open tunnels to the loopback Postgres ports: no
`sudo`, no `docker` group. To add a workstation's key, open Coolify's **Servers → localhost →
Terminal** (a root shell on the host) and append the full public key line to
`/home/lasce-ops/.ssh/authorized_keys`. Connect once interactively (`ssh lasce-coolify`) to accept
the host key before running a tunnel in the background.

## 2. Coolify resource (per environment)

1. In the `lasce` project, open the environment (`staging` or `production`) and add a resource:
   **Public repository** → `https://github.com/LasceUCR/lasce`, branch `development` (staging) or
   `main` (production), build pack **Docker Compose**, compose file
   `/infra/coolify/compose.yml`. Server: `localhost` (the Coolify host itself).
2. Fill in the environment variables listed in
   [`docs/deployment.md`](../../docs/deployment.md#coolify-per-resource). Use `pending` for
   `INFLUXDB_TOKEN` on the first deploy, and set `POSTGRES_LOOPBACK_PORT=15433` on staging so it
   does not collide with production's `15432`. Set memory limits on staging's services.
3. Assign domains: `web` on port 3000 (`https://lasce.ucr.ac.cr` for production), `minio` on port
   9000 (its public storage host). Both need DNS pointing at a public address, because session
   cookies are `Secure` and `next/image` refuses private storage hosts. Without a DNS record yet,
   use `<label>.163.178.171.26.sslip.io` (see
   [`docs/deployment.md`](../../docs/deployment.md#2-hosts-and-environments)).
4. Deploy. When it is up, open the `influxdb` container's terminal and mint the admin token:

   ```bash
   influxdb3 create token --admin
   ```

   Save it as `INFLUXDB_TOKEN` and redeploy. The token is shown once.

5. Copy the resource UUID (from its URL) into the GitHub Environment variable
   `COOLIFY_RESOURCE_UUID`.

If the GHCR packages are private, add `ghcr.io` with a `read:packages` token under the server's
Docker registry settings, or the pulls fail.

## 3. Self-hosted runner (on `lasce-jump`)

The runner only calls Coolify's API, so it gets a dedicated user with no `sudo` and no `docker`
group:

```bash
sudo useradd --create-home --shell /bin/bash github-runner
sudo apt-get install -y curl jq
sudo -iu github-runner
# Download the runner per Settings → Actions → Runners → New self-hosted runner (Linux x64), then:
./config.sh --url https://github.com/LasceUCR/lasce --token <registration token> \
  --name lasce-jump --labels lasce-coolify --unattended
exit
cd /home/github-runner/actions-runner && sudo ./svc.sh install github-runner && sudo ./svc.sh start
```

Check that it reaches Coolify: `curl -sS http://172.16.49.26:8000/api/health` from the runner
user should print `OK`.

## 4. Seed and first administrator

See [`docs/deployment.md`](../../docs/deployment.md#seeding-and-the-first-administrator).

## Validating `compose.yml` locally

`exclude_from_hc` is Coolify-only, so strip it first:

```bash
sed '/exclude_from_hc/d' infra/coolify/compose.yml \
  | LASCE_TAG=staging POSTGRES_PASSWORD=x CRON_SECRET=xxxxxxxx MINIO_ACCESS_KEY=x \
    MINIO_SECRET_KEY=x MINIO_PUBLIC_URL=http://localhost:9000 INFLUXDB_TOKEN=x \
    docker compose -f - config --quiet
```
