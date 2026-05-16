export const STATUS_IN_CART = '0'
export const STATUS_PAID = '2'
export const STATUS_CANCELLED = '6'

export const ORDER_STATUS_LABELS: Record<string, string> = {
  [STATUS_IN_CART]: 'Panier',
  [STATUS_PAID]: 'Payee',
  [STATUS_CANCELLED]: 'Annulee',
}
