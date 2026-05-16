import { sendXml } from '../../services/api'
import { extractDetail, generatePrestashopXML } from '../../services/xmlParser'
import { readXmlText } from '../../core/utils/xml'
import type { CartItem } from '../../core/models/cart'
import { loadDefaults } from './ConfigRepository'

export const createCart = async (customerId: string, addressId: string, items: CartItem[]) => {
  const defaults = await loadDefaults()
  const cartPayload = {
    id_address_delivery: addressId,
    id_address_invoice: addressId,
    id_currency: defaults.currencyId,
    id_lang: defaults.langId,
    id_customer: customerId,
    id_shop: defaults.shopId,
    associations: {
      cart_rows: {
        cart_row: items.map((item) => ({
          id_product: item.id,
          id_product_attribute: '0',
          id_address_delivery: addressId,
          quantity: String(item.quantity),
        })),
      },
    },
  }

  const xml = generatePrestashopXML('cart', cartPayload)
  const responseXml = await sendXml('carts', xml, 'POST')
  const detail = extractDetail(responseXml, 'cart') as Record<string, unknown> | null
  return readXmlText(detail?.id)
}

export const updateCart = async (
  cartId: string,
  customerId: string,
  addressId: string,
  items: CartItem[],
) => {
  const defaults = await loadDefaults()
  const cartPayload = {
    id: cartId,
    id_address_delivery: addressId,
    id_address_invoice: addressId,
    id_currency: defaults.currencyId,
    id_lang: defaults.langId,
    id_customer: customerId,
    id_shop: defaults.shopId,
    associations: {
      cart_rows: {
        cart_row: items.map((item) => ({
          id_product: item.id,
          id_product_attribute: '0',
          id_address_delivery: addressId,
          quantity: String(item.quantity),
        })),
      },
    },
  }

  const xml = generatePrestashopXML('cart', cartPayload)
  await sendXml(`carts/${cartId}`, xml, 'PUT')
}

export const createOrder = async (
  cartId: string,
  customerId: string,
  addressId: string,
  items: CartItem[],
  totalPaid: string,
) => {
  const defaults = await loadDefaults()
  const orderPayload = {
    id_address_delivery: addressId,
    id_address_invoice: addressId,
    id_cart: cartId,
    id_currency: defaults.currencyId,
    id_lang: defaults.langId,
    id_customer: customerId,
    id_carrier: defaults.carrierId,
    current_state: '0',
    module: 'ps_wirepayment',
    payment: 'Paiement manuel',
    total_paid: totalPaid,
    total_paid_tax_incl: totalPaid,
    total_paid_tax_excl: totalPaid,
    total_products: totalPaid,
    total_products_wt: totalPaid,
    total_shipping: '0',
    total_shipping_tax_incl: '0',
    total_shipping_tax_excl: '0',
    conversion_rate: '1',
    associations: {
      order_rows: {
        order_row: items.map((item) => ({
          product_id: item.id,
          product_attribute_id: '0',
          product_quantity: String(item.quantity),
          product_name: item.name,
          product_reference: item.reference,
          product_price: item.price,
          unit_price_tax_incl: item.price,
          unit_price_tax_excl: item.price,
        })),
      },
    },
  }

  const xml = generatePrestashopXML('order', orderPayload)
  const responseXml = await sendXml('orders', xml, 'POST')
  const detail = extractDetail(responseXml, 'order') as Record<string, unknown> | null

  return {
    orderId: readXmlText(detail?.id),
    reference: readXmlText(detail?.reference),
  }
}

export const createPayment = async (orderReference: string, amount: string) => {
  const paymentPayload = {
    order_reference: orderReference,
    amount,
    payment_method: 'Paiement manuel',
  }

  const xml = generatePrestashopXML('order_payment', paymentPayload)
  await sendXml('order_payments', xml, 'POST')
}
