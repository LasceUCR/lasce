/** A backend (the SUVI archive, InfluxDB, the CITIC worker, …) failed or returned unusable data. Maps to 502. */
export class ScientificDataUpstreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScientificDataUpstreamError'
  }
}

/**
 * No source or provider is registered for a query that passed validation. This is a wiring
 * defect in `index.ts`, not a user error, so the route answers it with a 500.
 */
export class UnsupportedScientificQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedScientificQueryError'
  }
}
