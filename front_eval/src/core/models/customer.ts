export type Customer = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export type SelectedUser = {
  id: string | null
  label: string
  email?: string
  isAnonymous: boolean
}
