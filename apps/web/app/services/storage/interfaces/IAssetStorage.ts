/**
 * Contract for an asset storage backend.
 *
 * Named `IAssetStorage` — an I-prefix, deliberately, unlike the rest of this
 * repo's unprefixed type names (`EndpointConfig`, `AssetStat`, `Props`). The
 * prefix is a chosen exception, not an accident: it marks this as the seam a
 * second backend implements, not a data shape.
 */
export interface IAssetStorage {
  /**
   * Issues a presigned upload for a direct browser → storage transfer.
   * Implementations must validate `input` with `parseAssetUploadRequest` (or
   * equivalent) before touching the backend, so an invalid request never
   * reaches it.
   */
  createUpload(file: File, bucket?: string): Promise<string>

  /**
   * Deletes an asset. Must be idempotent — deleting an already-missing key is
   * not an error — and must refuse any key outside the asset prefix rather
   * than forwarding it to the backend, so a bug in a caller cannot delete
   * objects this service does not own.
   */
  delete(objectKey: string): Promise<void>

  /** Presigned GET for downloading a private asset. */
  createDownloadUrl(objectKey: string, expiresInSeconds?: number): Promise<string>

  /** Returns whether the configured bucket exists. */
  bucketExists(bucket: string): Promise<boolean>

  /** Creates the configured bucket if it does not exist. */
  ensureBucket(bucket: string): Promise<void>

  /** Verify the integrity of an asset. */
  verifyAsset(file: File): void
}
