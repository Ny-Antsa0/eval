import './App.css'
import { ListeProduit } from './services/listeProduit'


export function App() {

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div>
          <p className="app-kicker">Front office</p>
          <h2>Catalogue produits</h2>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={() => {
            try {
              sessionStorage.removeItem('front_eval_logged_in')
            } finally {
              window.location.reload()
            }
          }}
        >
          Déconnecter
        </button>
      </header>

      <ListeProduit />
    </div>
  )
}

export default App
