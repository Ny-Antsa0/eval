import { parsePrice } from '../utils/formatters'
import type { OrderSummary } from '../utils/orderTypes'

export const calculateTotalOrders = (orders: OrderSummary[]) => orders.length

export const calculateTotalRevenue = (orders: OrderSummary[]) => {
  return orders.reduce((total, order) => total + parsePrice(order.totalPaid), 0)
}
