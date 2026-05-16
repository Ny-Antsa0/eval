import type {
  AppRoute,
  CsvTemplateHint,
  OrderStatusAction,
  ResetGroup,
} from './types'

// Route publique unique; toutes les autres sont protegees.
export const PUBLIC_ROUTE: AppRoute = '/login'
export const DEFAULT_AUTHENTICATED_ROUTE: Exclude<AppRoute, '/login'> =
  '/control'

// Onglets visibles apres login.
export const APP_ROUTES: Array<{ path: Exclude<AppRoute, '/login'>; label: string }> =
  [
    { path: '/control', label: 'Controle' },
    { path: '/orders', label: 'Commandes' },
  ]

// Ordre impose par les contraintes FK pour eviter les erreurs.
export const RESET_GROUPS: ResetGroup[] = [
  {
    id: 'sales',
    label: 'Ventes',
    description: 'Suppression des commandes et de leurs dependances.',
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
    id: 'customers',
    label: 'Clients',
    description: 'Nettoyage des clients puis des paniers.',
    resources: ['customers', 'carts'],
  },
  {
    id: 'catalog',
    label: 'Catalogue',
    description: 'Suppression des produits, options et declinaisons.',
    resources: [
      'combinations',
      'product_option_values',
      'product_options',
      'products',
    ],
  },
  {
    id: 'configuration',
    label: 'Config',
    description: 'Suppression des categories, taxes et regles.',
    resources: ['categories', 'taxes', 'tax_rules', 'tax_rule_groups'],
  },
]

export const ORDER_STATUS_ACTIONS: OrderStatusAction[] = [
  {
    id: '8',
    label: 'Echec paiement',
    description: 'Passe la commande en echec de paiement.',
  },
  {
    id: '2',
    label: 'Paiement effectue',
    description: 'Valide le paiement de la commande.',
  },
  {
    id: '6',
    label: 'Paiement annule',
    description: 'Marque la commande comme annulee.',
  },
]

export const CSV_TEMPLATE_HINTS: CsvTemplateHint[] = [
  {
    fileName: 'fichier1 / products',
    columns: [
      'date_availability_produit',
      'nom',
      'reference',
      'prix_ttc',
      'Taxe',
      'categorie',
      'prix_achat',
    ],
  },
  {
    fileName: 'fichier2 / combinations + stock',
    columns: [
      'reference',
      'specificite',
      'karazany',
      'stock_initial',
      'prix_vente_ttc',
    ],
  },
  {
    fileName: 'fichier3 / orders',
    columns: ['date', 'nom', 'email', 'pwd', 'adresse', 'achat', 'etat'],
  },
]

// Categories racine PrestaShop a conserver.
const protectedCategoryIds = new Set(['1', '2'])

// Garde simple: ne jamais supprimer les categories racine.
export const shouldSkipDeletion = (resourceName: string, resourceId: string) =>
  resourceName === 'categories' && protectedCategoryIds.has(resourceId)
