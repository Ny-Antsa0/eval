import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SelectedUser } from '../../core/models/customer'

const USER_STORAGE_KEY = 'front_eval_user'

type UserContextValue = {
  user: SelectedUser | null
  selectUser: (user: SelectedUser) => void
  selectAnonymous: () => void
  clearUser: () => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

const readStoredUser = (): SelectedUser | null => {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SelectedUser) : null
  } catch {
    return null
  }
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SelectedUser | null>(() => readStoredUser())

  useEffect(() => {
    if (user) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      sessionStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [user])

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      selectUser: setUser,
      selectAnonymous: () =>
        setUser({
          id: null,
          label: 'Utilisateur anonyme',
          isAnonymous: true,
        }),
      clearUser: () => setUser(null),
    }),
    [user],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser doit etre utilise dans UserProvider')
  }
  return context
}
