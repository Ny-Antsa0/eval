import { getData } from '../../services/api'
import { extractList } from '../../services/xmlParser'
import { readXmlText } from '../../core/utils/xml'
import type { Customer } from '../../core/models/customer'

const CUSTOMER_ENDPOINT = 'customers?display=full&filter[active]=1'

export const listCustomers = async (): Promise<Customer[]> => {
  const xml = await getData(CUSTOMER_ENDPOINT)
  if (!xml) {
    return []
  }

  const raw = extractList(xml, 'customer') as Array<Record<string, unknown>>

  return raw
    .map((customer) => ({
      id: readXmlText(customer.id),
      firstName: readXmlText(customer.firstname) || readXmlText(customer.first_name),
      lastName: readXmlText(customer.lastname) || readXmlText(customer.last_name),
      email: readXmlText(customer.email),
    }))
    .filter((customer) => customer.id)
}

export const fetchCustomerAddresses = async (customerId: string) => {
  const xml = await getData(`addresses?display=full&filter[id_customer]=[${customerId}]`)
  if (!xml) {
    return [] as Array<{ id: string }>
  }

  const raw = extractList(xml, 'address') as Array<Record<string, unknown>>
  return raw
    .map((address) => ({
      id: readXmlText(address.id),
    }))
    .filter((address) => address.id)
}
