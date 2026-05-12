import type { OrderItem } from '../pages/Dashboard'

type OrdersDashboardProps = {
  orders: OrderItem[]
  log: string[]
  isBusy: boolean
  onRefresh: () => void
  onUpdateStatus: (orderId: string, statusId: string) => void
}

const statusActions = [
  { label: 'Echec paiement', id: '8' },
  { label: 'Paiement effectue', id: '2' },
  { label: 'Paiement annule', id: '6' },
]

const OrdersDashboard = ({
  orders,
  log,
  isBusy,
  onRefresh,
  onUpdateStatus,
}: OrdersDashboardProps) => {
  return (
    <section className="card card-wide">
      <div className="card-header">
        <div>
          <h2>Commandes</h2>
          <p>Dashboard modifiable avec actions rapides sur les statuts.</p>
        </div>
        <button className="ghost" type="button" onClick={onRefresh}>
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
              <th>Actions rapides</th>
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
                  <td>{order.reference || '-'}</td>
                  <td>{order.total_paid || '-'}</td>
                  <td>
                    <span className="status-pill">
                      {order.current_state || 'N/A'}
                    </span>
                  </td>
                  <td>{order.date_add || '-'}</td>
                  <td>
                    <div className="actions">
                      {statusActions.map((action) => (
                        <button
                          key={`${order.id}-${action.id}`}
                          type="button"
                          className="tag"
                          disabled={isBusy}
                          onClick={() => onUpdateStatus(order.id, action.id)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="log">
        {log.length === 0 ? (
          <p className="muted">Aucune modification pour le moment.</p>
        ) : (
          <ul>
            {log.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default OrdersDashboard
