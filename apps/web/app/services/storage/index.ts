/**
 * Public entry point for the storage module. Everything a consumer needs —
 * the `IAssetStorage` contract, its MinIO implementation, config constants
 * and error types — is re-exported from here rather than reached through
 * deep imports into `implementations/`, `interfaces/`, `const/` or `errors/`.
 */
export type { IAssetStorage } from './interfaces/IAssetStorage'
export * from './const/storageConfig'
export { MinioAssetStorage } from './implementations/MinioAsssetStorage'
export { default as InvalidFileSizeError } from './errors/InvalidFileSizeError'
export { default as InvalidFileTypeError } from './errors/InvalidFileTypeError'
export { default as InvalidServiceConfigurationError } from './errors/InvalidServiceConfigurationError'
