import { useMemo, useState } from 'react'
import ActivityLog from './ActivityLog'
import { ORDER_STATUS_ACTIONS } from '../hooks/backOffice/constants'
import type { OrderItem } from '../hooks/backOffice/types'

type OrdersDashboardProps = {
  orders: OrderItem[]
  log: string[]
  isBusy: boolean
  onRefresh: () => void
  onUpdateStatus: (orderId: string, statusId: string) => void
}

const OrdersDashboard = ({
  orders,
  log,
  isBusy,
  onRefresh,
  onUpdateStatus,
}: OrdersDashboardProps) => {
  // Garde en memoire la selection pour l'editor de statut.
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Memoise la commande selectionnee pour eviter des recalculs inutiles.
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  )

  return (
    <section className="orders-layout">
      {/* Tableau principal des commandes. */}
      <div className="card card-wide">
        <div className="card-header">
          <div>
            <h2>Tableau des commandes</h2>
            <p>Chargement dynamique depuis l&apos;API et edition rapide.</p>
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
                      <span className="status-pill">{order.currentState}</span>
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

      {/* Panneau de details et actions rapides. */}
      <aside className="card order-editor">
        <div className="card-header">
          <div>
            <h2>Modification commande</h2>
            <p>Selectionnez une commande puis appliquez un statut rapide.</p>
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
                <dd>{selectedOrder.currentState}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{selectedOrder.dateAdded}</dd>
              </div>
            </dl>

            <div className="editor-actions">
              {ORDER_STATUS_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="tag"
                  title={action.description}
                  disabled={isBusy}
                  onClick={() => onUpdateStatus(selectedOrder.id, action.id)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">
            Cliquez sur &quot;Modifier&quot; dans le tableau pour ouvrir les
            actions rapides.
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

export default OrdersDashboard
