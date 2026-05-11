import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LoginGate } from './components/LoginGate.tsx'




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginGate />
    <ListeDeliveries />
  </StrictMode>,
)
