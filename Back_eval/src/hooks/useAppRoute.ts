import { useEffect, useState } from 'react'
import { DEFAULT_AUTHENTICATED_ROUTE, PUBLIC_ROUTE } from './backOffice/constants'
import type { AppRoute } from './backOffice/types'

// Liste blanche pour eviter des routes inconnues en URL.
const KNOWN_ROUTES: AppRoute[] = ['/login', '/control', '/orders']

// Type guard pour limiter les routes aux valeurs connues.
const isKnownRoute = (pathname: string): pathname is AppRoute =>
  KNOWN_ROUTES.includes(pathname as AppRoute)

// Utilise l'URL reelle du navigateur comme source de verite.
const readPathname = () => window.location.pathname || PUBLIC_ROUTE

export const resolveAppRoute = (
  pathname: string,
  isAuthenticated: boolean,
): AppRoute => {
  // Normalise l'URL: inconnue -> route par defaut selon auth.
  const candidateRoute = isKnownRoute(pathname)
    ? pathname
    : isAuthenticated
      ? DEFAULT_AUTHENTICATED_ROUTE
      : PUBLIC_ROUTE

  // Empeche l'acces direct aux routes protegees sans session.
  if (!isAuthenticated && candidateRoute !== PUBLIC_ROUTE) {
    return PUBLIC_ROUTE
  }

  // Evite de rester sur /login apres authentification.
  if (isAuthenticated && candidateRoute === PUBLIC_ROUTE) {
    return DEFAULT_AUTHENTICATED_ROUTE
  }

  return candidateRoute
}

// Synchronise l'URL sans rechargement (SPA).
const syncBrowserLocation = (route: AppRoute, replace: boolean) => {
  const historyMethod = replace ? 'replaceState' : 'pushState'
  window.history[historyMethod](null, '', route)
}

export const useAppRoute = (isAuthenticated: boolean) => {
  const [pathname, setPathname] = useState(() => readPathname())

  useEffect(() => {
    // Ecoute les retours/arriere pour rester coherent avec l'historique.
    const handleLocationChange = () => {
      setPathname(readPathname())
    }

    window.addEventListener('popstate', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  useEffect(() => {
    // Garde l'URL nette si l'utilisateur n'a pas le droit d'y acceder.
    const guardedRoute = resolveAppRoute(pathname, isAuthenticated)
    if (guardedRoute !== readPathname()) {
      syncBrowserLocation(guardedRoute, true)
    }
  }, [isAuthenticated, pathname])

  const navigateTo = (nextRoute: AppRoute, replace = false) => {
    // Chaque navigation passe par la garde pour eviter un mauvais etat.
    const guardedRoute = resolveAppRoute(nextRoute, isAuthenticated)
    syncBrowserLocation(guardedRoute, replace)
    setPathname(guardedRoute)
  }

  return {
    route: resolveAppRoute(pathname, isAuthenticated),
    navigateTo,
  }
}
