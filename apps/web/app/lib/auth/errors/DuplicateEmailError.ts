import BaseError from '@/app/errors/BaseError'

/**
 * Thrown by `createUser` when the unique index on `auth.users.email` rejects an
 * insert. The message deliberately omits the address so it can be logged.
 */
export default class DuplicateEmailError extends BaseError {
  constructor() {
    super('An account with this email already exists', 409, 'DUPLICATE_EMAIL', false)
    this.name = 'DuplicateEmailError'
  }
}
