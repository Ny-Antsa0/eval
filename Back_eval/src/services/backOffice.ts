import { deleteData, getData, sendXml, uploadBinary } from './api'
import { extractDetail, extractList, generatePrestashopXML } from './xmlParser'

// Token stocke en sessionStorage pour bloquer le deep-linking.
export const SESSION_KEY = 'ps8_backoffice_token'

// Ecrit la session apres login.
export const setSessionToken = (token: string) => {
  sessionStorage.setItem(SESSION_KEY, token)
}

// Lit la session existante (null si absente).
export const getSessionToken = () => sessionStorage.getItem(SESSION_KEY)

// Supprime la session lors du logout.
export const clearSessionToken = () => {
  sessionStorage.removeItem(SESSION_KEY)
}

// Login local pour la demo (admin/admin).
export const login = (username: string, password: string) => {
  if (username === 'admin' && password === 'admin') {
    return 'admin-token'
  }
  return null
}

// Convertit le pluriel API en singulier pour les payloads XML.
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

// Recuperation liste complete d'une ressource.
export const fetchResourceList = async (resourcePlural: string) => {
  const xml = await getData(resourcePlural)
  if (!xml) return []
  const singular = toSingular(resourcePlural)
  return extractList(xml, singular)
}

export const fetchResourceListFromEndpoint = async (
  endpoint: string,
  resourcePlural: string,
) => {
  const xml = await getData(endpoint)
  if (!xml) return []
  const singular = toSingular(resourcePlural)
  return extractList(xml, singular)
}

// Recuperation des IDs uniquement pour le nettoyage.
export const fetchResourceIdentifiers = async (resourcePlural: string) => {
  const xml = await getData(`${resourcePlural}?display=[id]&limit=1000`)
  if (!xml) return []

  const singular = toSingular(resourcePlural)
  return extractList(xml, singular)
    .map((item) => String(item.id || ''))
    .filter(Boolean)
}

// Suppression unitaire, laisse la gestion d'erreur au caller.
export const deleteResourceById = async (resourcePlural: string, id: string) => {
  await deleteData(`${resourcePlural}/${id}`)
}

const buildFilterEndpoint = (
  resourcePlural: string,
  filters: Record<string, string>,
  display = 'full',
) => {
  const params = new URLSearchParams({ display })

  Object.entries(filters).forEach(([fieldName, value]) => {
    params.set(`filter[${fieldName}]`, `[${value}]`)
  })

  return `${resourcePlural}?${params.toString()}`
}

export const fetchResourceByFilters = async (
  resourcePlural: string,
  filters: Record<string, string>,
) => {
  const endpoint = buildFilterEndpoint(resourcePlural, filters)
  const items = await fetchResourceListFromEndpoint(endpoint, resourcePlural)
  return items[0] ?? null
}

export const fetchResourceByField = async (
  resourcePlural: string,
  fieldName: string,
  value: string,
) => fetchResourceByFilters(resourcePlural, { [fieldName]: value })

export const createResourceFromRecord = async (
  resourcePlural: string,
  record: Record<string, unknown>,
) => {
  const singular = toSingular(resourcePlural)
  const xml = generatePrestashopXML(singular, record)
  const responseXml = await sendXml(resourcePlural, xml, 'POST')
  const createdResource = extractDetail(responseXml, singular)
  return String(createdResource?.id || '')
}

export const updateResourceFromRecord = async (
  resourcePlural: string,
  id: string,
  record: Record<string, unknown>,
) => {
  const singular = toSingular(resourcePlural)
  const xml = generatePrestashopXML(singular, { id, ...record })
  await sendXml(`${resourcePlural}/${id}`, xml, 'PUT')
  return id
}

// PrestaShop attend du XML pour POST/PUT.
export const upsertResourceFromRecord = async (
  resourcePlural: string,
  record: Record<string, string>,
) => {
  const singular = toSingular(resourcePlural)
  const xml = generatePrestashopXML(singular, record)

  if (record.id) {
    // Record avec ID => update.
    await sendXml(`${resourcePlural}/${record.id}`, xml, 'PUT')
    return
  }

  // Pas d'ID => creation.
  await sendXml(resourcePlural, xml, 'POST')
}

// Change le statut d'une commande via order_histories.
export const updateOrderStatus = async (orderId: string, statusId: string) => {
  const xml = generatePrestashopXML('order_history', {
    id_order: orderId,
    id_order_state: statusId,
  })

  await sendXml('order_histories', xml, 'POST')
}

// Upload d'image binaire liee a un produit.
export const uploadProductImage = async (productId: string, file: File) => {
  await uploadBinary(`images/products/${productId}`, file)
}
