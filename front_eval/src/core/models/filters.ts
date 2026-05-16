export type CatalogFilters = {
  search: string
  categoryId: string
  minPrice: string
  maxPrice: string
  sortBy: 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc'
}
