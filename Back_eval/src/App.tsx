import './App.css'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import { useBackOffice } from './hooks/useBackOffice'

function App() {
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
  } = useBackOffice()

  if (!isAuthenticated) {
    return <Login onLogin={loginUser} isBusy={false} error={authError} />
  }

  return (
    <Dashboard
      groups={groups}
      orders={orders}
      logs={logs}
      busy={busy}
      onResetGroup={resetGroup}
      onImportCsv={importCsv}
      onUploadZip={uploadZip}
      onRefreshOrders={refreshOrders}
      onUpdateOrderStatus={updateOrderStatus}
      onLogout={logout}
    />
  )
}

export default App
