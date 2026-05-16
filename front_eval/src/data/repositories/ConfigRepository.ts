import { getData } from '../../services/api'
import { extractList } from '../../services/xmlParser'
import { readXmlText } from '../../core/utils/xml'

const readConfigurationValue = async (name: string, fallback: string) => {
  const xml = await getData(`configurations?display=full&filter[name]=[${name}]`)
  if (!xml) {
    return fallback
  }

  const list = extractList(xml, 'configuration') as Array<Record<string, unknown>>
  if (list.length === 0) {
    return fallback
  }

  return readXmlText(list[0]?.value) || fallback
}

export const loadDefaults = async () => {
  return {
    langId: await readConfigurationValue('PS_LANG_DEFAULT', '1'),
    currencyId: await readConfigurationValue('PS_CURRENCY_DEFAULT', '1'),
    shopId: await readConfigurationValue('PS_SHOP_DEFAULT', '1'),
    carrierId: await readConfigurationValue('PS_CARRIER_DEFAULT', '1'),
  }
}
