import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartItem } from '../../core/models/cart'
import { calculateCartTotals } from '../../core/use-cases/calculateCartTotals'
import { formatPrice } from '../../core/utils/formatters'
import { createCart, createOrder, createPayment, updateCart } from '../../data/repositories/CartRepository'
import { fetchCustomerAddresses } from '../../data/repositories/CustomerRepository'
import { useUser } from './UserContext'

const CART_STORAGE_KEY = 'front_eval_cart'
const CART_ID_STORAGE_KEY = 'front_eval_cart_id'
const ORDER_REF_STORAGE_KEY = 'front_eval_order_reference'

type ToastState = { tone: 'success' | 'error'; message: string } | null

type CartContextValue = {
  items: CartItem[]
  totalAmount: string
  totalQuantity: number
  isSyncing: boolean
  toast: ToastState
  addItem: (item: CartItem) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  clearToast: () => void
  placeOrder: () => Promise<void>
  payOrder: () => Promise<void>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

const readStoredItems = (): CartItem[] => {
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

const readStoredValue = (key: string) => sessionStorage.getItem(key) || ''

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, clearUser } = useUser()
  const [items, setItems] = useState<CartItem[]>(() => readStoredItems())
  const [cartId, setCartId] = useState(() => readStoredValue(CART_ID_STORAGE_KEY))
  const [orderReference, setOrderReference] = useState(() => readStoredValue(ORDER_REF_STORAGE_KEY))
  const [isSyncing, setIsSyncing] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (cartId) {
      sessionStorage.setItem(CART_ID_STORAGE_KEY, cartId)
    } else {
      sessionStorage.removeItem(CART_ID_STORAGE_KEY)
    }
  }, [cartId])

  useEffect(() => {
    if (orderReference) {
      sessionStorage.setItem(ORDER_REF_STORAGE_KEY, orderReference)
    } else {
      sessionStorage.removeItem(ORDER_REF_STORAGE_KEY)
    }
  }, [orderReference])

  const { totalAmountFormatted, totalAmountValue, totalQuantity } = useMemo(() => {
    const totals = calculateCartTotals(items)
    return {
      totalAmountFormatted: formatPrice(totals.totalAmount),
      totalAmountValue: totals.totalAmount,
      totalQuantity: totals.totalQuantity,
    }
  }, [items])

  const syncCart = async (nextItems: CartItem[]) => {
    if (!user || user.isAnonymous || !user.id) {
      return
    }

    const addresses = await fetchCustomerAddresses(user.id)
    const addressId = addresses.length > 0 ? addresses[0].id : ''

    if (!addressId) {
      setToast({ tone: 'error', message: "Aucune adresse client disponible." })
      clearUser()
      return
    }

    setIsSyncing(true)

    try {
      if (!cartId) {
        const createdId = await createCart(user.id, addressId, nextItems)
        if (!createdId) {
          throw new Error('cart-id-missing')
        }
        setCartId(createdId)
      } else {
        await updateCart(cartId, user.id, addressId, nextItems)
      }
    } catch (error) {
      setToast({ tone: 'error', message: 'Synchronisation panier impossible.' })
    } finally {
      setIsSyncing(false)
    }
  }

  const addItem = (item: CartItem) => {
    const existing = items.find((entry) => entry.id === item.id)
    const nextItems = existing
      ? items.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        )
      : [...items, { ...item, quantity: Math.max(item.quantity, 1) }]

    setItems(nextItems)
    void syncCart(nextItems)
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    const safeQuantity = Math.max(1, Math.floor(quantity))
    const nextItems = items.map((entry) =>
      entry.id === itemId ? { ...entry, quantity: safeQuantity } : entry,
    )

    setItems(nextItems)
    void syncCart(nextItems)
  }

  const removeItem = (itemId: string) => {
    const nextItems = items.filter((entry) => entry.id !== itemId)
    setItems(nextItems)
    void syncCart(nextItems)
  }

  const clearToast = () => setToast(null)

  const placeOrder = async () => {
    if (!user || user.isAnonymous || !user.id) {
      setToast({ tone: 'error', message: 'Connectez-vous pour commander.' })
      clearUser()
      return
    }

    if (items.length === 0) {
      setToast({ tone: 'error', message: 'Panier vide.' })
      return
    }

    const addresses = await fetchCustomerAddresses(user.id)
    const addressId = addresses.length > 0 ? addresses[0].id : ''

    if (!addressId) {
      setToast({ tone: 'error', message: "Adresse client manquante." })
      clearUser()
      return
    }

    try {
      const ensuredCartId = cartId || (await createCart(user.id, addressId, items))
      if (!ensuredCartId) {
        throw new Error('cart-id-missing')
      }
      setCartId(ensuredCartId)

      const order = await createOrder(
        ensuredCartId,
        user.id,
        addressId,
        items,
        totalAmountValue.toFixed(2),
      )

      setOrderReference(order.reference)
      setToast({ tone: 'success', message: 'Commande creee avec succes.' })
    } catch (error) {
      setToast({ tone: 'error', message: "Echec de creation de commande." })
    }
  }

  const payOrder = async () => {
    if (!user || user.isAnonymous || !user.id) {
      setToast({ tone: 'error', message: 'Connectez-vous pour payer.' })
      clearUser()
      return
    }

    if (!orderReference) {
      setToast({ tone: 'error', message: "Aucune commande a payer." })
      return
    }

    try {
      await createPayment(orderReference, totalAmountValue.toFixed(2))
      setToast({ tone: 'success', message: 'Paiement enregistre.' })
    } catch (error) {
      setToast({ tone: 'error', message: 'Echec du paiement.' })
    }
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalAmount: totalAmountFormatted,
      totalQuantity,
      isSyncing,
      toast,
      addItem,
      updateQuantity,
      removeItem,
      clearToast,
      placeOrder,
      payOrder,
    }),
    [items, totalAmountFormatted, totalAmountValue, totalQuantity, isSyncing, toast],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart doit etre utilise dans CartProvider')
  }
  return context
}
