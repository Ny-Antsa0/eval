import type { OrderItem } from './types'

const asText = (value: unknown, fallback = '') =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback

// Normalise le format brut de l'API pour l'UI.
export const mapOrders = (list: Array<Record<string, unknown>>): OrderItem[] => {
  return list
    .map((order) => ({
      id: asText(order.id),
      reference: asText(order.reference, '-'),
      totalPaid: asText(order.total_paid, '-'),
      currentState: asText(order.current_state, 'N/A'),
      dateAdded: asText(order.date_add, '-'),
      statusLabel: asText(order.order_state?.name, ''),
    }))
    // Garde uniquement les commandes valides.
    .filter((order) => order.id)
}
