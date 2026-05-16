export type ProductSummary = Record<string, unknown>

export type CategoryOption = {
  id: string
  name: string
}

export type EnrichedProduct = {
  id: string
  summary: ProductSummary
  info: ProductSummary | null
  images: { id: string; src: string }[]
}
