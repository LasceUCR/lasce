# syntax=docker/dockerfile:1
#
# Build context is the repository root:
#   docker build -f infra/docker/worker.Dockerfile .

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS base
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1
WORKDIR /app

# --- dependencies -------------------------------------------------------------
# Install from the lockfile before copying the source, so editing a processor
# does not invalidate the dependency layer.
FROM base AS deps
COPY apps/worker/pyproject.toml apps/worker/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# --- runtime ------------------------------------------------------------------
FROM base AS runner
COPY --from=deps /app/.venv /app/.venv
COPY apps/worker/pyproject.toml ./
COPY apps/worker/app ./app

ENV PATH="/app/.venv/bin:${PATH}"

RUN useradd --create-home --uid 1001 worker && chown -R worker:worker /app
USER worker

CMD ["python", "-m", "app.main"]
