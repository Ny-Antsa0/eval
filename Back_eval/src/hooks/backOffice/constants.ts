import type { ResetGroup } from '../../pages/Dashboard'

// FK constraints require this deletion order.
export const RESET_GROUPS: ResetGroup[] = [
  {
    label: 'Ventes',
    resources: [
      'order_details',
      'order_histories',
      'order_invoices',
      'order_payments',
      'order_slip',
      'order_cart_rules',
      'order_carriers',
      'orders',
    ],
  },
  {
    label: 'Clients',
    resources: ['customers', 'carts'],
  },
  {
    label: 'Catalogue',
    resources: [
      'combinations',
      'product_option_values',
      'product_options',
      'products',
    ],
  },
  {
    label: 'Config',
    resources: ['categories', 'taxes', 'tax_rules', 'tax_rule_groups'],
  },
]
