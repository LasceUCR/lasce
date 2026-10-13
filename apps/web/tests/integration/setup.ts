import { checkIntegrationDatabase } from './guard'

// Runs before any test file is imported, so `@lasce/db` connects to the checked database or the
// run stops here, before a single query.
const database = checkIntegrationDatabase(process.env)

if (!database.ok) {
  throw new Error(`Refusing to run the database integration tests: ${database.reason}`)
}

process.env.DATABASE_URL = database.url
