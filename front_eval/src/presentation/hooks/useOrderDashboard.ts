import { useMemo } from 'react'
import { calculateTotalOrders, calculateTotalRevenue } from '../../core/use-cases/calculateMetrics'
import { formatPrice } from '../../core/utils/formatters'
import type { OrderSummary } from '../../core/utils/orderTypes'

export const useOrderDashboard = (orders: OrderSummary[]) => {
  const totalOrders = useMemo(() => calculateTotalOrders(orders), [orders])
  const totalRevenue = useMemo(() => calculateTotalRevenue(orders), [orders])

  return {
    totalOrders,
    totalRevenueFormatted: formatPrice(totalRevenue),
  }
}
