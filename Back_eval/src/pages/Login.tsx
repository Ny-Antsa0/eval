import { useState } from 'react'

type LoginProps = {
  onLogin: (username: string, password: string) => Promise<void> | void
  isBusy: boolean
  error: string | null
}

const Login = ({ onLogin, isBusy, error }: LoginProps) => {
  // Prefill pour le login de demo afin d'accelerer l'acces.
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-kicker">PrestaShop 8</span>
          <h1>Back-Office Custom</h1>
          <p>
            Connexion rapide avec session protegee. Les identifiants sont
            pre-remplis pour accelerer l&apos;acces.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            // Evite le refresh navigateur et declenche le login applicatif.
            event.preventDefault()
            onLogin(username, password)
          }}
        >
          <label>
            <span>Login</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {/* Affiche un message d'erreur uniquement si la tentative echoue. */}
          {error ? <div className="auth-error">{error}</div> : null}

          <button className="primary" type="submit" disabled={isBusy}>
            {/* Bloque les doublons quand une requete est en cours. */}
            {isBusy ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default Login
