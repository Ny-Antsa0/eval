
import './App.css'
import { ListeDeliveries } from './components/test.tsx'


export function App() {

  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <h1>eo mba misy mandeha eh</h1>
        </div>
        <div className="app-header-right">
          <button
            type="button"
            className="logout-button"
            onClick={() => {
              try {
                sessionStorage.removeItem('front_eval_logged_in')
              } finally {
                // reload to show login gate again
                window.location.reload()
              }
            }}
          >
            Déconnecter
          </button>
            <div>
              <ListeDeliveries />
            </div>

        </div>
      </header>
    </>
  )
}

export default App
