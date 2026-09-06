# Managing assets

`apps/web/app/services/storage/` uploads files to MinIO and deletes them again, behind an
`IAssetStorage` interface. It is a **service layer only** — no route handler, Server Action or UI
calls it yet. This page is how you put one there.

> **Status: unfinished.** The service works, but several obligations its own interface documents
> are not implemented, and its default configuration does not boot. Read
> [Known gaps](#known-gaps) before you build on it.

## Importing it

The module has a barrel at `app/services/storage/index.ts`:

```ts
import {
  MinioAssetStorage,
  MAX_ASSET_BYTES,
  ALLOWED_ASSET_CONTENT_TYPES,
  DOWNLOAD_EXPIRY_SECONDS,
  InvalidFileSizeError,
  InvalidFileTypeError,
  type IAssetStorage,
} from '@/app/services/storage'
```

`app/services/container.ts` exports a ready-made instance:

```ts
import { assetStorage } from '@/app/services/container'
```

> **Server-only.** The constructor reads `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` from
> `process.env`. Importing this from a `'use client'` component leaks credentials into the browser
> bundle. Keep it behind a Server Action or a route handler.
>
> The container builds its instance **eagerly, at module scope**, so importing `container.ts` at
> all constructs a MinIO client — including during `next build`.

## The shape of an upload

The file **passes through the Next server**. There is no presigned POST policy and no direct
browser → MinIO transfer: the browser posts the file to your Server Action, the server buffers it
in memory, and `putObject` writes it.

```text
browser → Server Action → createUpload(file) → Buffer in memory → putObject → MinIO
                                             → returns objectKey (a string)
```

Two consequences worth planning around:

- **The Next body-size limit applies.** Server Actions default to a 1 MB request body, far below
  the service's own 25 MiB `MAX_ASSET_BYTES`. Raise `experimental.serverActions.bodySizeLimit` in
  `apps/web/next.config.ts` (currently unset) or the upload fails before `createUpload` is ever
  reached.
- **The whole file is held in memory** as a `Buffer` for the duration of the write, per concurrent
  upload.

### A Server Action in front of it

```ts
'use server'

import { assetStorage } from '@/app/services/container'
import { InvalidFileSizeError, InvalidFileTypeError } from '@/app/services/storage'

export type UploadResult = { ok: true; objectKey: string } | { ok: false; error: string }

export async function uploadAsset(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'No file provided' }

  try {
    return { ok: true, objectKey: await assetStorage.createUpload(file) }
  } catch (error) {
    // Both carry a statusCode/errorCode from BaseError, so a route handler can
    // map them straight onto an HTTP response.
    if (error instanceof InvalidFileSizeError || error instanceof InvalidFileTypeError) {
      return { ok: false, error: error.message }
    }
    throw error
  }
}
```

## The interface

`app/services/storage/interfaces/IAssetStorage.ts`:

| Method                                     | Returns            | Notes                                                          |
| ------------------------------------------ | ------------------ | -------------------------------------------------------------- |
| `createUpload(file, bucket?)`              | `Promise<string>`  | Validates, ensures the bucket, uploads. Resolves to the key.   |
| `delete(objectKey)`                        | `Promise<void>`    | Calls `removeObject`. No prefix guard — see Known gaps.        |
| `createDownloadUrl(objectKey, expiresIn?)` | `Promise<string>`  | Presigned GET. Defaults to `DOWNLOAD_EXPIRY_SECONDS` (1 hour). |
| `bucketExists(bucket)`                     | `Promise<boolean>` | Passthrough to the MinIO client.                               |
| `ensureBucket(bucket)`                     | `Promise<void>`    | Creates the bucket when absent. Called by `createUpload`.      |
| `verifyAsset(file)`                        | `void`             | Throws on an invalid file. Synchronous.                        |

There is no `stat()`. Nothing here writes to PostgreSQL: persist `objectKey` yourself in the
caller if you need to list assets or attach them to a record.

## What is validated

`verifyAsset` runs first inside `createUpload`, so an invalid file never reaches MinIO — no
`bucketExists`, no `putObject`. It checks two things, **in this order**:

| Check       | Rule                                                                | Throws                       |
| ----------- | ------------------------------------------------------------------- | ---------------------------- |
| `file.size` | Must be `<=` `MAX_ASSET_BYTES` (25 MiB). Exactly at the cap passes. | `InvalidFileSizeError` (413) |
| `file.type` | Exact match against `ALLOWED_ASSET_CONTENT_TYPES`                   | `InvalidFileTypeError` (415) |

`ALLOWED_ASSET_CONTENT_TYPES` is PNG, JPEG, WebP, GIF, PDF and CSV, in
`app/services/storage/const/storageConfig.ts`. The comparison is exact and case-sensitive, so a
browser-supplied `text/csv; charset=utf-8` is **rejected**.

Both errors extend `BaseError` (`app/errors/BaseError.ts`) and carry `statusCode`, `errorCode` and
`isFatal` getters. `InvalidServiceConfigurationError` also exists but nothing throws it yet.

This validation is the _only_ enforcement. Because the upload is a server-side `putObject` rather
than a POST policy, MinIO applies no size or content-type condition of its own — unlike the Python
worker's path. A caller that bypasses `createUpload` and calls `putObject` directly is unchecked.

## Object keys

`createUpload` builds the key as:

```text
<Date.now()>_<file.name>        e.g.  1767225600000_report.csv
```

The filename is used **raw**. There is no sanitization, no uuid, no `assets/` prefix and no date
segments, so:

- a filename containing `/` creates nested pseudo-directories in the bucket;
- two uploads within the same millisecond collide;
- keys sit at the bucket root alongside anything else in that bucket.

## Configuration

The service reads `process.env` **directly**. It does not go through `serverEnv()` from
`packages/config`, so those variables are never validated on this path.

| Variable               | Read by                       | Fallback in code | In `packages/config` schema?   |
| ---------------------- | ----------------------------- | ---------------- | ------------------------------ |
| `MINIO_ENDPOINT`       | constructor                   | `'localhost'`    | yes (default `localhost:9000`) |
| `MINIO_PORT`           | constructor                   | `'9000'`         | **no**                         |
| `MINIO_USE_SSL`        | constructor (`=== 'true'`)    | `false`          | yes                            |
| `MINIO_ACCESS_KEY`     | constructor                   | `''`             | yes (optional)                 |
| `MINIO_SECRET_KEY`     | constructor                   | `''`             | yes (optional)                 |
| `MINIO_DEFAULT_BUCKET` | `createUpload`                | `'default'`      | **no**                         |
| `MINIO_BUCKET`         | `delete`, `createDownloadUrl` | `''`             | yes (default `lasce-files`)    |

Endpoint and credentials are captured **once, at construction**; bucket names are read **per
call**, so stubbing them in a test does not require a new instance.

The bucket is created on first use by `ensureBucket`, mirroring the worker's `ensure_bucket()`.
There is no bootstrap script and no `mc` init container.

## Known gaps

These are real, currently in `main`'s working tree, and pinned by the test suite as _current_
behaviour rather than desired behaviour. Fix them before putting a caller in front of this.

1. **The documented endpoint value does not boot.** The constructor passes `MINIO_ENDPOINT`
   straight to MinIO's `endPoint`, which rejects a `host:port` string:
   `InvalidEndpointError: Invalid endPoint : localhost:9000`. But `localhost:9000` is exactly what
   `.env.example` ships and what `packages/config` defaults to. Because `container.ts` constructs
   eagerly, importing it under the documented configuration throws. Either split the host from the
   port before constructing, or change the documented value.
2. **Upload and delete use different buckets.** `createUpload` reads `MINIO_DEFAULT_BUCKET`;
   `delete` and `createDownloadUrl` read `MINIO_BUCKET`. `.env.example` happens to set both to
   `lasce-files`, which masks it — but drop either one and an uploaded object cannot be deleted or
   downloaded. `delete` falls back to `''`, not to a real bucket.
3. **`delete` keeps neither promise in its own JSDoc.** The interface says it "must be idempotent"
   and "must refuse any key outside the asset prefix". It does neither: there is no prefix guard,
   so any key the caller passes is forwarded, including the worker's `readings/*` objects.
4. **`createUpload`'s doc comment describes code that is not there.** It documents a presigned
   POST policy, zod validation, `setContentLengthRange` and `setContentType`. The implementation is
   a plain `putObject`. Trust the code, not the comment.
5. **`createDownloadUrl(key, 0)` silently becomes 1 hour**, because the default is applied with
   `||` rather than `??`.
6. **No credential guard.** Missing `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` become empty strings and
   surface as an authentication failure from MinIO on first use, not as a configuration error.
7. **`MINIO_PUBLIC_ENDPOINT` is not implemented.** There is one client, used for both signing and
   transfer, so a URL signed inside Docker Compose points at the internal host.
8. **`InvalidFileTypeError` imports `MAX_ASSET_BYTES` and never uses it.**

## Testing

Unit tests live in `apps/web/tests/unit/services/storage/MinioAssetStorage.test.ts` — 15 tests
covering `verifyAsset`, `createUpload`, `delete` and `createDownloadUrl`.

The class takes no constructor arguments and builds its own `Minio.Client`, so there is no
injection seam: mock the `minio` module and hold the method stubs at module scope.

```ts
const bucketExists = vi.fn()
const putObject = vi.fn()

vi.mock('minio', () => ({
  Client: class {
    bucketExists = bucketExists
    putObject = putObject
    // …makeBucket, removeObject, presignedGetObject
  },
}))
```

Because the endpoint is read at construction and buckets per call, stub the environment with
`vi.stubEnv` and build the instance _after_. `File` comes from jsdom; override `size` with
`Object.defineProperty` rather than allocating 25 MiB for the boundary cases.

**Testing a caller** is the weak spot today: `container.ts` exports a single eager `const`, with no
`setAssetStorage()` seam, so a caller's test has to `vi.mock('@/app/services/container')` (or mock
`minio` again). Writing a caller is a good moment to make the container lazy and swappable.

## Adding another backend

`IAssetStorage` exists so `MinioAssetStorage` is not the only thing that can satisfy it — a local
filesystem store for offline development, another S3-compatible provider, or an in-memory fake.

1. Implement all six methods of `IAssetStorage`
   (`app/services/storage/interfaces/IAssetStorage.ts`) and call `verifyAsset` at the top of
   `createUpload` so validation stays identical across backends.
2. Export it from `app/services/storage/index.ts`.
3. Return it from `app/services/container.ts` behind whatever selection logic you need.

Callers import `assetStorage` from the container, never `MinioAssetStorage` directly, so nothing
in front of the service needs to change.

## Verify

```bash
pnpm --filter @lasce/web typecheck
pnpm --filter @lasce/web test:unit
```

`pnpm --filter @lasce/web test` adds coverage thresholds, which the workspace does **not** meet
today — see [component_testing.md](tests/component_testing.md#coverage-thresholds).
