import { getData } from './api'
import { extractDetail } from './xmlParser'
import { readXmlText } from '../core/utils/xml'

export type ProductInfo = Record<string, unknown>

export const loadProductInfo = async (productId: string | number): Promise<ProductInfo | null> => {
  const xmlData = await getData(`products/${productId}`)

  if (!xmlData) {
    return null
  }

  const product = extractDetail(xmlData, 'product')
  return product ? (product as ProductInfo) : null
}

export type ProductDetails = {
  featureIds: string[]
  combinationIds: string[]
  stockValue: string
}

export const extractProductDetails = (product: ProductInfo): ProductDetails => {
  const associations = (product.associations || {}) as Record<string, unknown>
  const features = associations.product_features as Record<string, unknown> | Record<string, unknown>[] | undefined
  const combinations = associations.combinations as Record<string, unknown> | Record<string, unknown>[] | undefined

  const featureIds: string[] = []
  if (Array.isArray(features)) {
    for (const feature of features) {
      const id = readXmlText((feature as Record<string, unknown>).id)
      if (id) {
        featureIds.push(id)
      }
    }
  } else if (features) {
    const id = readXmlText((features as Record<string, unknown>).id)
    if (id) {
      featureIds.push(id)
    }
  }

  const combinationIds: string[] = []
  if (Array.isArray(combinations)) {
    for (const combo of combinations) {
      const id = readXmlText((combo as Record<string, unknown>).id)
      if (id) {
        combinationIds.push(id)
      }
    }
  } else if (combinations) {
    const id = readXmlText((combinations as Record<string, unknown>).id)
    if (id) {
      combinationIds.push(id)
    }
  }

  const stockValue = readXmlText(product.quantity)

  return { featureIds, combinationIds, stockValue }
}