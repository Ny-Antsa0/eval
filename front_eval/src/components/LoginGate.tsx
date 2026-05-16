import App from '../App.tsx'
import { CartProvider } from '../presentation/context/CartContext'
import { UserProvider, useUser } from '../presentation/context/UserContext'
import UserPickerPage from '../presentation/views/UserPickerPage'

const UserGate = () => {
  const { user } = useUser()

  if (!user) {
    return <UserPickerPage />
  }

  return <App />
}

export function LoginGate() {
  return (
    <UserProvider>
      <CartProvider>
        <UserGate />
      </CartProvider>
    </UserProvider>
  )
}
