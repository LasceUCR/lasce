export interface OverviewRole {
  id: string
  name: string
}

export interface OverviewUser {
  id: string
  name: string
  email: string
  institution: string
  country: string
  roleIds: string[]
}
