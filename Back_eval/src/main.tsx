import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Point d'entree: monter l'app React sur #root avec StrictMode pour signaler
// les usages a risque en dev, sans impacter le runtime en prod.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
