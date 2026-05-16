import { useUser } from '../context/UserContext'
import { useCustomers } from '../hooks/useCustomers'

const UserPickerPage = () => {
  const { selectUser, selectAnonymous } = useUser()
  const { customers, loading, error } = useCustomers()

  return (
    <main className="login-shell">
      <section className="login-card" aria-label="Selection utilisateur">
        <p className="login-badge">Utilisateur</p>
        <h1>Choisir un compte</h1>
        <p className="login-copy">
          Selectionnez un client pour continuer ou utilisez le mode anonyme.
        </p>

        <div className="user-list">
          <button type="button" className="user-card" onClick={selectAnonymous}>
            <div>
              <p className="user-name">Utilisateur anonyme</p>
              <p className="user-meta">Acces visiteur sans paiement</p>
            </div>
          </button>

          {loading ? <p className="login-hint">Chargement des clients...</p> : null}
          {error ? <p className="login-error">{error}</p> : null}

          {customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className="user-card"
              onClick={() =>
                selectUser({
                  id: customer.id,
                  label: `${customer.firstName} ${customer.lastName}`.trim() || customer.email,
                  email: customer.email,
                  isAnonymous: false,
                })
              }
            >
              <div>
                <p className="user-name">
                  {customer.firstName || customer.lastName
                    ? `${customer.firstName} ${customer.lastName}`.trim()
                    : customer.email}
                </p>
                <p className="user-meta">{customer.email}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

export default UserPickerPage
