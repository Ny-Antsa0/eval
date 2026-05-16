import type { CartItem } from '../models/cart'
import { parsePrice } from '../utils/formatters'

export const calculateCartTotals = (items: CartItem[]) => {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0,
  )

  return { totalQuantity, totalAmount }
}
