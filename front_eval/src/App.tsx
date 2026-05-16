import { useState } from 'react'
import './App.css'
import CatalogPage from './presentation/views/CatalogPage'
import CartPage from './presentation/views/CartPage'
import Toast from './presentation/components/shared/Toast'
import { useUser } from './presentation/context/UserContext'
import { useCart } from './presentation/context/CartContext'

type AppView = 'catalog' | 'cart'

export function App() {
  const { user, clearUser } = useUser()
  const { totalQuantity, toast, clearToast } = useCart()
  const [activeView, setActiveView] = useState<AppView>('catalog')

  const handleRequireLogin = () => {
    clearUser()
  }

  return (
    <div className="app-shell">
      {toast ? (
        <div className="toast-stack" onClick={clearToast}>
          <Toast message={toast.message} tone={toast.tone} />
        </div>
      ) : null}

      <header className="app-topbar">
        <div>
          <p className="app-kicker">Front office</p>
          <h2>Catalogue produits</h2>
          <p className="app-user">
            {user?.label || 'Utilisateur'}
            {user?.isAnonymous ? ' (anonyme)' : ''}
          </p>
        </div>

        <div className="app-actions">
          <nav className="route-tabs" aria-label="Navigation">
            <button
              type="button"
              className={activeView === 'catalog' ? 'tab-active' : 'tab'}
              onClick={() => setActiveView('catalog')}
            >
              Catalogue
            </button>
            <button
              type="button"
              className={activeView === 'cart' ? 'tab-active' : 'tab'}
              onClick={() => setActiveView('cart')}
            >
              Panier ({totalQuantity})
            </button>
          </nav>

          <button type="button" className="logout-button" onClick={clearUser}>
            Changer d'utilisateur
          </button>
        </div>
      </header>

      {activeView === 'catalog' ? (
        <CatalogPage />
      ) : (
        <CartPage onRequireLogin={handleRequireLogin} />
      )}
    </div>
  )
}

export default App
