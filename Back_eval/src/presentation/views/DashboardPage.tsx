import { useState } from 'react'
import type { OrderSummary } from '../../core/utils/orderTypes'
import { ORDER_STATUS_LABELS, STATUS_CANCELLED, STATUS_IN_CART, STATUS_PAID } from '../../core/constants/orderStatus'
import KpiCard from '../components/shared/KpiCard'
import ActivityLog from '../../components/ActivityLog'
import { useOrderDashboard } from '../hooks/useOrderDashboard'

type DashboardPageProps = {
  orders: OrderSummary[]
  log: string[]
  isBusy: boolean
  onRefresh: () => void
  onUpdateStatus: (orderId: string, statusId: string) => void
}

const statusBadgeClass = (statusId: string) => {
  switch (statusId) {
    case STATUS_PAID:
      return 'status-pill status-pill--paid'
    case STATUS_CANCELLED:
      return 'status-pill status-pill--cancelled'
    default:
      return 'status-pill status-pill--cart'
  }
}

const DashboardPage = ({
  orders,
  log,
  isBusy,
  onRefresh,
  onUpdateStatus,
}: DashboardPageProps) => {
  const { totalOrders, totalRevenueFormatted } = useOrderDashboard(orders)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null

  return (
    <section className="orders-layout">
      <div className="card card-wide">
        <div className="card-header">
          <div>
            <h2>Tableau des commandes</h2>
            <p>Vue dashboard avec KPI et actions rapides.</p>
          </div>
          <button
            className="ghost"
            type="button"
            onClick={onRefresh}
            disabled={isBusy}
          >
            Actualiser
          </button>
        </div>

        <div className="kpi-grid">
          <KpiCard label="Nombre de commandes" value={String(totalOrders)} icon="📦" color="teal" />
          <KpiCard label="Montant total" value={totalRevenueFormatted} icon="€" color="amber" />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Reference</th>
                <th>Total</th>
                <th>Etat</th>
                <th>Date</th>
                <th>Modification</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Aucune commande chargee.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.reference}</td>
                    <td>{order.totalPaid}</td>
                    <td>
                      <span className={statusBadgeClass(order.currentState)}>
                        {order.statusLabel || ORDER_STATUS_LABELS[order.currentState] || order.currentState}
                      </span>
                    </td>
                    <td>{order.dateAdded}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="card order-editor">
        <div className="card-header">
          <div>
            <h2>Actions statut</h2>
            <p>Mettre a jour le statut d'une commande selectionnee.</p>
          </div>
          {selectedOrder ? (
            <span className="section-badge">#{selectedOrder.id}</span>
          ) : null}
        </div>

        {selectedOrder ? (
          <>
            <dl className="order-details">
              <div>
                <dt>Reference</dt>
                <dd>{selectedOrder.reference}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{selectedOrder.totalPaid}</dd>
              </div>
              <div>
                <dt>Etat actuel</dt>
                <dd>{selectedOrder.statusLabel || ORDER_STATUS_LABELS[selectedOrder.currentState] || selectedOrder.currentState}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{selectedOrder.dateAdded}</dd>
              </div>
            </dl>

            <div className="editor-actions">
              <button
                type="button"
                className="tag"
                disabled={isBusy}
                onClick={() => onUpdateStatus(selectedOrder.id, STATUS_PAID)}
              >
                Payer
              </button>
              <button
                type="button"
                className="tag"
                disabled={isBusy}
                onClick={() => onUpdateStatus(selectedOrder.id, STATUS_CANCELLED)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="tag"
                disabled={isBusy}
                onClick={() => onUpdateStatus(selectedOrder.id, STATUS_IN_CART)}
              >
                Panier
              </button>
            </div>
          </>
        ) : (
          <p className="muted">
            Cliquez sur "Modifier" dans le tableau pour ouvrir les actions.
          </p>
        )}

        <ActivityLog
          title="Historique des changements"
          lines={log}
          emptyMessage="Aucune modification pour le moment."
        />
      </aside>
    </section>
  )
}

export default DashboardPage
