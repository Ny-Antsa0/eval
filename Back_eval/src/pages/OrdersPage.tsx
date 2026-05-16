import type { OrderItem } from '../hooks/backOffice/types'
import DashboardPage from '../presentation/views/DashboardPage'

type OrdersPageProps = {
  orders: OrderItem[]
  log: string[]
  isBusy: boolean
  onRefresh: () => void
  onUpdateStatus: (orderId: string, statusId: string) => Promise<void> | void
}

const OrdersPage = ({
  orders,
  log,
  isBusy,
  onRefresh,
  onUpdateStatus,
}: OrdersPageProps) => {
  return (
    <>
      {/* Contexte et objectif de la page commandes. */}
      <section className="page-intro">
        <div>
          <span className="kicker">Page 2</span>
          <h1>Gestion des commandes</h1>
        </div>
        <p>
          Consultation des commandes et changement rapide des statuts via
          l&apos;endpoint order_histories.
        </p>
      </section>

      <DashboardPage
        orders={orders}
        log={log}
        isBusy={isBusy}
        onRefresh={onRefresh}
        onUpdateStatus={onUpdateStatus}
      />
    </>
  )
}

export default OrdersPage
