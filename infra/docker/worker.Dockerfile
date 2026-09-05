# syntax=docker/dockerfile:1
#
# Build context is the repository root:
#   docker build -f infra/docker/worker.Dockerfile .

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS base
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1
# app/settings.py derives REPO_ROOT from parents[3] of its own path, so the
# module has to sit at <root>/apps/worker/app/settings.py exactly as it does in
# the repository. Do not flatten this to /app.
WORKDIR /repo/apps/worker

# --- dependencies -------------------------------------------------------------
# Install from the lockfile before copying the source, so editing a processor
# does not invalidate the dependency layer.
FROM base AS deps
COPY apps/worker/pyproject.toml apps/worker/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# --- runtime ------------------------------------------------------------------
FROM base AS runner
COPY --from=deps /repo/apps/worker/.venv ./.venv
COPY apps/worker/pyproject.toml ./
COPY apps/worker/app ./app

ENV PATH="/repo/apps/worker/.venv/bin:${PATH}"

RUN useradd --create-home --uid 1001 worker && chown -R worker:worker /repo
USER worker

CMD ["python", "-m", "app.main"]
