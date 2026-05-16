import { buildApiUrl, getData } from './api'
import { extractList } from './xmlParser'
import { readXmlText } from '../core/utils/xml'

export type ProductImage = {
  id: string
  src: string
}

export const loadProductImages = async (productId: string | number): Promise<ProductImage[]> => {
  const xmlData = await getData(`images/products/${productId}`)

  if (!xmlData) {
    return []
  }

  const images = extractList(xmlData, 'image') as Array<Record<string, unknown>>

  return images
    .map((image) => {
      const id = readImageId(image)

      if (!id) {
        return null
      }

      return {
        id,
        src: buildApiUrl(`images/products/${productId}/${id}`),
      }
    })
    .filter((image): image is ProductImage => image !== null)
}

function readImageId(image: Record<string, unknown>) {
  const candidates = [image.id, image.id_image, image.image_id]

  for (const candidate of candidates) {
    const text = readXmlText(candidate)
    if (text) {
      return text
    }
  }

  for (const value of Object.values(image)) {
    const text = readXmlText(value)
    if (text) {
      return text
    }
  }

  return ''
}