// Routes autorisees pour la navigation interne.
export type AppRoute = '/login' | '/control' | '/orders'

// Groupe de nettoyage et dependances associees.
export type ResetGroup = {
  id: string
  label: string
  description: string
  resources: string[]
}

// Format normalise affiche dans le tableau des commandes.
export type OrderItem = {
  id: string
  reference: string
  totalPaid: string
  currentState: string
  dateAdded: string
  statusLabel?: string
}

// Action rapide de changement de statut.
export type OrderStatusAction = {
  id: string
  label: string
  description: string
}

// Exemple d'entete de tableur pour guider l'utilisateur.
export type CsvTemplateHint = {
  fileName: string
  columns: string[]
}

// Flags de chargement par fonctionnalite.
export type BusyState = {
  reset: boolean
  csv: boolean
  zip: boolean
  orders: boolean
}

// Historiques de traitement par fonctionnalite.
export type LogState = {
  reset: string[]
  csv: string[]
  zip: string[]
  orders: string[]
}

// Cles derivees pour l'indexation des etats.
export type BusyKey = keyof BusyState
export type LogKey = keyof LogState

// Image extraite d'une archive ZIP et associee a un produit.
export type ZipUpload = {
  productId: string
  fileName: string
  file: File
}
