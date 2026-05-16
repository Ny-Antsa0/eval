import type { CatalogFilters } from '../models/filters'
import type { EnrichedProduct } from '../models/product'
import { parseDate, parsePrice } from '../utils/formatters'
import { readCategoryIds, readField, readProductDates, readProductName } from '../utils/productReaders'

const normalizeSearch = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const filterAndSortProducts = (
  products: EnrichedProduct[],
  filters: CatalogFilters,
) => {
  const searchQuery = normalizeSearch(filters.search)

  const filtered = products.filter((product) => {
    const base = product.info || product.summary
    const name = normalizeSearch(readProductName(base, product.id))

    if (searchQuery && !name.includes(searchQuery)) {
      return false
    }

    if (filters.categoryId !== 'all') {
      const categoryValues = [
        readField(base, 'id_category_default'),
        readField(base, 'id_category'),
        ...readCategoryIds(base),
      ].filter(Boolean)

      if (!categoryValues.includes(filters.categoryId)) {
        return false
      }
    }

    const priceValue = parsePrice(readField(base, 'price'))

    if (filters.minPrice && priceValue < parsePrice(filters.minPrice)) {
      return false
    }

    if (filters.maxPrice && priceValue > parsePrice(filters.maxPrice)) {
      return false
    }

    return true
  })

  const sorted = [...filtered]

  sorted.sort((first, second) => {
    if (filters.sortBy === 'price-asc' || filters.sortBy === 'price-desc') {
      const firstPrice = parsePrice(readField(first.info || first.summary, 'price'))
      const secondPrice = parsePrice(readField(second.info || second.summary, 'price'))
      return filters.sortBy === 'price-asc' ? firstPrice - secondPrice : secondPrice - firstPrice
    }

    const firstDates = readProductDates(first.info || first.summary)
    const secondDates = readProductDates(second.info || second.summary)
    const firstDate = parseDate(firstDates.dateUpd || firstDates.dateAdd || '')
    const secondDate = parseDate(secondDates.dateUpd || secondDates.dateAdd || '')
    const firstTime = firstDate ? firstDate.getTime() : 0
    const secondTime = secondDate ? secondDate.getTime() : 0

    return filters.sortBy === 'date-asc' ? firstTime - secondTime : secondTime - firstTime
  })

  return sorted
}
