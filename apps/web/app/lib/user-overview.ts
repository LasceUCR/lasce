export interface OverviewRole {
  id: string
  name: string
  description?: string
}

export class RoleAssignmentError extends Error {
  constructor(
    message: string,
    readonly reloadRequired = false,
  ) {
    super(message)
    this.name = 'RoleAssignmentError'
  }
}

export interface OverviewUser {
  id: string
  name: string
  email: string
  institution: string
  country: string
  roleIds: string[]
}
