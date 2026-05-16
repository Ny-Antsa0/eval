import type { ProductSummary } from '../models/product'
import { readXmlText } from './xml'

export const readField = (source: Record<string, unknown>, key: string) => {
  const value = source[key]

  if (Array.isArray(value)) {
    return value.map((item) => readXmlText(item)).filter(Boolean).join(', ')
  }

  return readXmlText(value)
}

export const readProductName = (product: ProductSummary, fallbackId?: string) => {
  return readField(product, 'name') || (fallbackId ? `Produit ${fallbackId}` : 'Produit')
}

export const readCategoryIds = (product: ProductSummary) => {
  const values: string[] = []
  const associations = product.associations as Record<string, unknown> | undefined

  if (!associations) {
    return values
  }

  const categories = associations.categories as Record<string, unknown> | Record<string, unknown>[] | undefined

  if (Array.isArray(categories)) {
    for (const category of categories) {
      const id = readField(category as ProductSummary, 'id')
      if (id) {
        values.push(id)
      }
    }
  } else if (categories) {
    const id = readField(categories as ProductSummary, 'id')
    if (id) {
      values.push(id)
    }
  }

  return values
}

export const readProductDates = (product: ProductSummary) => {
  return {
    dateAdd: readField(product, 'date_add') || readField(product, 'dateAdd'),
    dateUpd: readField(product, 'date_upd') || readField(product, 'dateUpd'),
  }
}
