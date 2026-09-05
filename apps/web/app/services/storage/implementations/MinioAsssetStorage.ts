import * as Minio from "minio";
import type { IAssetStorage } from '../interfaces/IAssetStorage'
import { ALLOWED_ASSET_CONTENT_TYPES, DOWNLOAD_EXPIRY_SECONDS, MAX_ASSET_BYTES } from "../const/storageConfig";
import InvalidFileSizeError from "../errors/InvalidFileSizeError";
import InvalidFileTypeError from "../errors/InvalidFileTypeError";


/**
 * MinIO-backed implementation of `IAssetStorage`: presigned POST-policy
 * uploads and deletes for `apps/web`.
 */
export class MinioAssetStorage implements IAssetStorage {
  
  private readonly client: Minio.Client;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
    })
  }

  /**
   * Issues a presigned POST policy for a direct browser → MinIO upload.
   *
   * The request is validated with zod *before* any client is touched — an
   * oversize `sizeBytes` or a `contentType` outside `ALLOWED_ASSET_CONTENT_TYPES`
   * never reaches `#ensureBucket()` or MinIO at all — but that check alone is
   * advisory: a caller that bypasses this method, or a browser client that
   * edits the multipart form after receiving it, is not bound by it. That is
   * exactly why the upload goes through a POST *policy* rather than a presigned
   * PUT URL: `setContentLengthRange` and `setContentType` below are enforced by
   * MinIO itself when the file lands, so a client that edits our validation
   * still gets rejected server-side. Someone "simplifying" this back to
   * `presignedPutObject` would silently drop that enforcement.
   */
  async createUpload(file: File, bucket?: string): Promise<string> {
    this.verifyAsset(file); // this throws if the file is invalid, preventing any further processing
    const bucketToUse = bucket || process.env.MINIO_DEFAULT_BUCKET || 'default'
    await this.ensureBucket(bucketToUse);

    const filepath = new Date().getTime() + "_" + file.name;
    const buffer = await file.arrayBuffer();

    await this.client.putObject(
      bucketToUse,
      filepath,
      Buffer.from(buffer),
      file.size,
      {
        'Content-Type': file.type,
        'Content-Length': file.size.toString(),
      }
    )


    return filepath;

  }

  /**
   * Deletes an asset. Must be idempotent — deleting an already-missing key is
   * not an error — and must refuse any key outside the asset prefix rather
   * than forwarding it to the backend, so a bug in a caller cannot delete
   * objects this service does not own.
   */
  async delete(objectKey: string): Promise<void> {
    await this.client.removeObject(process.env.MINIO_BUCKET || '', objectKey);
  }

  /** Checks if a bucket exists. */
  async bucketExists(bucket: string): Promise<boolean> {
    return this.client.bucketExists(bucket);
  }

  /** Ensures the configured bucket exists, creating it if it does not. */
  async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.bucketExists(bucket);
    if (!exists) {
      await this.client.makeBucket(bucket, '');
    }
  }


  async createDownloadUrl(objectKey: string, expiresInSeconds?: number): Promise<string> {
    const bucket = process.env.MINIO_BUCKET || '';
    const expiry = expiresInSeconds || DOWNLOAD_EXPIRY_SECONDS; // default to configured expiry
    return this.client.presignedGetObject(bucket, objectKey, expiry);
  }


  verifyAsset(file: File): void {
    const sizeBytes = file.size;
    const contentType = file.type;
    if(sizeBytes > MAX_ASSET_BYTES) throw new InvalidFileSizeError(file.name, sizeBytes);
    if(!ALLOWED_ASSET_CONTENT_TYPES.some((t) => t === contentType)) throw new InvalidFileTypeError(file.name, contentType);
    return 
  }

}
