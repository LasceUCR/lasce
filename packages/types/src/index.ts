/**
 * Types with no runtime counterpart, shared across the workspace.
 *
 * Anything that needs validation at runtime belongs in `@lasce/contracts` instead —
 * this package must stay import-free so it can be used from any environment.
 */

export * from './job.js'
export * from './pagination.js'
