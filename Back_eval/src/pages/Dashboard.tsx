import ControlCenter from './ControlCenter'
import OrdersPage from './OrdersPage'
import { APP_ROUTES } from '../hooks/backOffice/constants'
import type {
  AppRoute,
  BusyState,
  LogState,
  OrderItem,
  ResetGroup,
} from '../hooks/backOffice/types'

type DashboardProps = {
  route: Exclude<AppRoute, '/login'>
  groups: ResetGroup[]
  orders: OrderItem[]
  logs: LogState
  busy: BusyState
  toast: { tone: 'success' | 'error'; message: string } | null
  onClearToast: () => void
  onResetGroup: (group: ResetGroup) => void
  onImportCsv: (files: FileList | File[]) => void
  onUploadZip: (files: FileList | File[]) => void
  onRefreshOrders: () => void
  onUpdateOrderStatus: (orderId: string, statusId: string) => void
  onNavigate: (route: AppRoute) => void
  onLogout: () => void
}

const Dashboard = ({
  route,
  groups,
  orders,
  logs,
  busy,
  toast,
  onClearToast,
  onResetGroup,
  onImportCsv,
  onUploadZip,
  onRefreshOrders,
  onUpdateOrderStatus,
  onNavigate,
  onLogout,
}: DashboardProps) => {
  return (
    <main className="app-shell">
      {toast ? (
        <div className="toast-stack" onClick={onClearToast}>
          <div className={`toast toast--${toast.tone}`} role="status">
            {toast.message}
          </div>
        </div>
      ) : null}
      {/* Topbar globale: branding, navigation et logout. */}
      <header className="topbar">
        <div>
          <span className="kicker">Gestionnaire PrestaShop 8</span>
          <h1>Back-Office Custom</h1>
        </div>

        <div className="topbar-actions">
          {/* Navigation interne; la garde se fait via useAppRoute. */}
          <nav className="route-tabs" aria-label="Navigation principale">
            {APP_ROUTES.map((routeItem) => (
              <button
                key={routeItem.path}
                type="button"
                className={route === routeItem.path ? 'tab-active' : 'tab'}
                onClick={() => onNavigate(routeItem.path)}
              >
                {routeItem.label}
              </button>
            ))}
          </nav>

          <button className="ghost" type="button" onClick={onLogout}>
            Deconnexion
          </button>
        </div>
      </header>

      {/* Rendu conditionnel selon l'onglet actif. */}
      {route === '/control' ? (
        <ControlCenter
          groups={groups}
          busy={busy}
          logs={logs}
          onResetGroup={onResetGroup}
          onImportCsv={onImportCsv}
          onUploadZip={onUploadZip}
        />
      ) : (
        <OrdersPage
          orders={orders}
          log={logs.orders}
          isBusy={busy.orders}
          onRefresh={onRefreshOrders}
          onUpdateStatus={onUpdateOrderStatus}
        />
      )}
    </main>
  )
}

export default Dashboard
