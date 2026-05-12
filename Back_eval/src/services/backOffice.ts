import { deleteData, getData, sendXml, uploadBinary } from './api'
import { extractList, generatePrestashopXML } from './xmlParser'

// Session token stored in sessionStorage to prevent deep-link access.
export const SESSION_KEY = 'ps8_backoffice_token'

export const setSessionToken = (token: string) => {
  sessionStorage.setItem(SESSION_KEY, token)
}

export const getSessionToken = () => sessionStorage.getItem(SESSION_KEY)

export const clearSessionToken = () => {
  sessionStorage.removeItem(SESSION_KEY)
}

// Local quick login for the demo (admin/admin).
export const login = (username: string, password: string) => {
  if (username === 'admin' && password === 'admin') {
    return 'admin-token'
  }
  return null
}

// Convert plural API resource names to singular for XML parsing.
export const toSingular = (resource: string) => {
  if (resource.endsWith('ies')) {
    return `${resource.slice(0, -3)}y`
  }
  if (resource.endsWith('ses')) {
    return resource.slice(0, -2)
  }
  if (resource.endsWith('s')) {
    return resource.slice(0, -1)
  }
  return resource
}

export const fetchResourceList = async (resourcePlural: string) => {
  const xml = await getData(resourcePlural)
  if (!xml) return []
  const singular = toSingular(resourcePlural)
  return extractList(xml, singular)
}

export const deleteResourceById = async (resourcePlural: string, id: string) => {
  await deleteData(`${resourcePlural}/${id}`)
}

// PrestaShop expects XML payloads for POST/PUT.
export const upsertResourceFromRecord = async (
  resourcePlural: string,
  record: Record<string, string>,
) => {
  const singular = toSingular(resourcePlural)
  const xml = generatePrestashopXML(singular, record)

  if (record.id) {
    await sendXml(`${resourcePlural}/${record.id}`, xml, 'PUT')
    return
  }

  await sendXml(resourcePlural, xml, 'POST')
}

export const updateOrderStatus = async (orderId: string, statusId: string) => {
  const xml = generatePrestashopXML('order_history', {
    id_order: orderId,
    id_order_state: statusId,
  })

  await sendXml('order_histories', xml, 'POST')
}

export const uploadProductImage = async (productId: string, file: File) => {
  await uploadBinary(`images/products/${productId}`, file)
}
