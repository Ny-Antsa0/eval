import { getData } from '../../services/api'
import { extractList } from '../../services/xmlParser'
import { readXmlText } from '../../core/utils/xml'
import type { CategoryOption, ProductSummary } from '../../core/models/product'

export const listProducts = async (): Promise<ProductSummary[]> => {
  const xml = await getData('products?display=full&filter[active]=1')
  if (!xml) {
    return []
  }

  return extractList(xml, 'product') as ProductSummary[]
}

export const listCategories = async (): Promise<CategoryOption[]> => {
  const xml = await getData('categories?filter[active]=1')
  if (!xml) {
    return []
  }

  const raw = extractList(xml, 'category') as Array<Record<string, unknown>>

  return raw
    .map((category) => ({
      id: readXmlText(category.id),
      name: readXmlText(category.name) || `Categorie ${readXmlText(category.id)}`,
    }))
    .filter((category) => category.id)
}
