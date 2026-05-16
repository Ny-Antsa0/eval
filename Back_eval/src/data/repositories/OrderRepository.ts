import { sendXml } from '../../services/api'
import { generatePrestashopXML } from '../../services/xmlParser'
import { fetchResourceListFromEndpoint } from '../../services/backOffice'

export const listOrders = async () => {
  return fetchResourceListFromEndpoint('orders?display=full', 'orders')
}

export const updateStatus = async (orderId: string, statusId: string) => {
  const xml = generatePrestashopXML('order_history', {
    id_order: orderId,
    id_order_state: statusId,
  })

  await sendXml('order_histories', xml, 'POST')
}
