export const parsePrice = (value: string | number) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const normalized = value
    .replace(/[^0-9,.-]/g, '')
    .replace(',', '.')
    .trim()

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export const formatPrice = (amount: number) => {
  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}
