import { useEffect, useRef } from 'react'
import './App.css'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import { DEFAULT_AUTHENTICATED_ROUTE } from './hooks/backOffice/constants'
import type { AppRoute } from './hooks/backOffice/types'
import { useAppRoute } from './hooks/useAppRoute'
import { useBackOffice } from './hooks/useBackOffice'

function App() {
  // Hook central: expose etat auth, donnees et actions metier.
  const {
    isAuthenticated,
    authError,
    groups,
    orders,
    logs,
    busy,
    loginUser,
    logout,
    resetGroup,
    importCsv,
    uploadZip,
    refreshOrders,
    updateOrderStatus,
    toast,
    clearToast,
  } = useBackOffice()

  // Garde de route: normalise l'URL et empeche l'acces direct sans session.
  const { route, navigateTo } = useAppRoute(isAuthenticated)
  // Conserve uniquement les routes autorisees apres login.
  const protectedRoute: Exclude<AppRoute, '/login'> =
    route === '/orders' ? '/orders' : DEFAULT_AUTHENTICATED_ROUTE
  // Evite de recharger les commandes plus d'une fois quand on arrive sur /orders.
  const hasAutoLoadedOrders = useRef(false)
  // Garde la version la plus recente de refreshOrders dans un ref stable.
  const refreshOrdersRef = useRef(refreshOrders)

  useEffect(() => {
    // Si la fonction change, mettre a jour le ref pour eviter un stale closure.
    refreshOrdersRef.current = refreshOrders
  }, [refreshOrders])

  useEffect(() => {
    // Auto-chargement conditionnel pour la page commandes.
    if (!isAuthenticated) {
      hasAutoLoadedOrders.current = false
      return
    }

    if (protectedRoute !== '/orders') {
      return
    }

    if (orders.length > 0) {
      hasAutoLoadedOrders.current = true
      return
    }

    if (!hasAutoLoadedOrders.current) {
      hasAutoLoadedOrders.current = true
      void refreshOrdersRef.current()
    }
  }, [isAuthenticated, orders.length, protectedRoute])

  const handleLogin = async (username: string, password: string) => {
    // Apres login, forcer la route par defaut pour eviter /login.
    const loginSucceeded = await loginUser(username, password)
    if (loginSucceeded) {
      navigateTo(DEFAULT_AUTHENTICATED_ROUTE, true)
    }
  }

  const handleLogout = () => {
    // Supprime la session puis redirige vers /login.
    logout()
    navigateTo('/login', true)
  }

  // Shell d'auth: afficher l'ecran login tant que la session est absente.
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} isBusy={false} error={authError} />
  }

  return (
    <Dashboard
      route={protectedRoute}
      groups={groups}
      orders={orders}
      logs={logs}
      busy={busy}
      toast={toast}
      onClearToast={clearToast}
      onResetGroup={resetGroup}
      onImportCsv={importCsv}
      onUploadZip={uploadZip}
      onRefreshOrders={refreshOrders}
      onUpdateOrderStatus={updateOrderStatus}
      onNavigate={navigateTo}
      onLogout={handleLogout}
    />
  )
}

export default App
