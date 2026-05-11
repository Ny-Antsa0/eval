import { useState, type FormEvent } from 'react'
import App from '../App.tsx'
import main from '../main.tsx'

const SESSION_KEY = 'front_eval_logged_in'

export function LoginGate() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  })
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (username === 'admin' && password === 'admin') {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setIsLoggedIn(true)
      setError('')
      return
    }

    setError('Identifiants invalides. Essaie admin / admin.')
  }

  if (!isLoggedIn) {
    return (
      <main className="login-shell">
        <section className="login-card" aria-label="Connexion">
          <p className="login-badge">Accès protégé</p>
          <h1>Connexion</h1>
          <p className="login-copy">
            Connecte-toi pour afficher le contenu principal de l'application.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Nom d'utilisateur</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
              />
            </label>

            <label>
              <span>Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? <p className="login-error">{error}</p> : null}

            <button type="submit" className="login-button">
              Se connecter
            </button>
          </form>

          <p className="login-hint">
            Démo: <strong>admin</strong> / <strong>admin</strong>
          </p>
        </section>
      </main>
    )
  }

  return <main />
}
