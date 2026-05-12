import CsvDropzone from '../components/CsvDropzone'
import OrdersDashboard from '../components/OrdersDashboard'
import ResetPanel from '../components/ResetPanel'
import ZipUploader from '../components/ZipUploader'

type LogBundle = {
  reset: string[]
  csv: string[]
  zip: string[]
  orders: string[]
}

type BusyBundle = {
  reset: boolean
  csv: boolean
  zip: boolean
  orders: boolean
}

export type ResetGroup = {
  label: string
  resources: string[]
}

export type OrderItem = {
  id: string
  reference?: string
  total_paid?: string
  current_state?: string
  date_add?: string
}

type DashboardProps = {
  groups: ResetGroup[]
  orders: OrderItem[]
  logs: LogBundle
  busy: BusyBundle
  onResetGroup: (group: ResetGroup) => void
  onImportCsv: (files: FileList | File[]) => void
  onUploadZip: (file: File) => void
  onRefreshOrders: () => void
  onUpdateOrderStatus: (orderId: string, statusId: string) => void
  onLogout: () => void
}

const Dashboard = ({
  groups,
  orders,
  logs,
  busy,
  onResetGroup,
  onImportCsv,
  onUploadZip,
  onRefreshOrders,
  onUpdateOrderStatus,
  onLogout,
}: DashboardProps) => {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="kicker">Gestionnaire PrestaShop 8</span>
          <h1>Controle centralise</h1>
        </div>
        <button className="ghost" type="button" onClick={onLogout}>
          Deconnexion
        </button>
      </header>

      <section className="grid">
        <ResetPanel
          groups={groups}
          isBusy={busy.reset}
          log={logs.reset}
          onReset={onResetGroup}
        />
        <CsvDropzone
          isBusy={busy.csv}
          log={logs.csv}
          onImport={onImportCsv}
        />
        <ZipUploader
          isBusy={busy.zip}
          log={logs.zip}
          onUpload={onUploadZip}
        />
      </section>

      <OrdersDashboard
        orders={orders}
        log={logs.orders}
        isBusy={busy.orders}
        onRefresh={onRefreshOrders}
        onUpdateStatus={onUpdateOrderStatus}
      />
    </main>
  )
}

export default Dashboard
