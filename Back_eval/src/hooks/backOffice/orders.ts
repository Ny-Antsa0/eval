import type { OrderItem } from '../../pages/Dashboard'

export const mapOrders = (list: Array<Record<string, string>>): OrderItem[] => {
  return list
    .map((order) => ({
      id: String(order.id || ''),
      reference: order.reference,
      total_paid: order.total_paid,
      current_state: order.current_state,
      date_add: order.date_add,
    }))
    .filter((order) => order.id)
}
