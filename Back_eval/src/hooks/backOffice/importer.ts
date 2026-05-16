import type { ParsedImportTable } from './csv'
import {
  createResourceFromRecord,
  fetchResourceByField,
  fetchResourceByFilters,
  fetchResourceListFromEndpoint,
  updateResourceFromRecord,
} from '../../services/backOffice'

type SpreadsheetRecord = Record<string, string>

type ProductImport = {
  id: string
  reference: string
  name: string
  priceTaxIncl: number
  priceTaxExcl: number
  taxRate: number
}

type CombinationImport = {
  id: string
  productId: string
  productReference: string
  optionValue: string
  priceTaxIncl: number
  priceTaxExcl: number
}

type ImportDefaults = {
  langId: string
  currencyId: string
  countryId: string
  shopId: string
  shopGroupId: string
  carrierId: string
  customerGroupId: string
}

type ImportContext = {
  defaults: ImportDefaults
  categoryIdsByName: Map<string, string>
  taxIdsByRate: Map<string, string>
  taxGroupIdsByRate: Map<string, string>
  optionGroupIdsByName: Map<string, string>
  optionValueIdsByKey: Map<string, string>
  productsByReference: Map<string, ProductImport>
  combinationsByProductAndValue: Map<string, CombinationImport>
}

const ROOT_CATEGORY_ID = '2'
const DEFAULT_LANG_ID = '1'
const DEFAULT_CURRENCY_ID = '1'
const DEFAULT_COUNTRY_ID = '1'
const DEFAULT_SHOP_ID = '1'
const DEFAULT_SHOP_GROUP_ID = '1'
const DEFAULT_CARRIER_ID = '1'
const DEFAULT_CUSTOMER_GROUP_ID = '3'
const DEFAULT_PAYMENT_MODULE = 'ps_wirepayment'

const normalizeLookup = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const valueAsString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(valueAsString).find(Boolean) ?? ''
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (record.language) {
      return valueAsString(record.language)
    }
  }

  return ''
}

const localized = (value: string, langId: string) => ({
  language: {
    '@attrs': { id: langId },
    '#text': value,
  },
})

const parseNumber = (value: string | undefined, fallback = 0) => {
  const normalizedValue = String(value ?? '')
    .replace(/\s/g, '')
    .replace(',', '.')
  const parsed = Number(normalizedValue)
  return Number.isFinite(parsed) ? parsed : fallback
}

const formatDecimal = (value: number, precision = 6) =>
  value.toFixed(precision).replace(/\.?0+$/, '')

const formatPrice = (value: number) => formatDecimal(value, 6)

const excelSerialDateToIsoDate = (value: string) => {
  const serialDate = Number(value)
  if (!Number.isFinite(serialDate) || serialDate < 20000) {
    return value
  }

  const unixTimestamp = Math.round((serialDate - 25569) * 86400 * 1000)
  return new Date(unixTimestamp).toISOString().slice(0, 10)
}

const normalizeDate = (value: string | undefined) => {
  const rawDate = String(value ?? '').trim()
  if (!rawDate) {
    return new Date().toISOString().slice(0, 10)
  }

  if (/^\d+(\.\d+)?$/.test(rawDate)) {
    return excelSerialDateToIsoDate(rawDate)
  }

  return rawDate.slice(0, 10)
}

const toDateTime = (value: string | undefined) => `${normalizeDate(value)} 00:00:00`

const normalizeTaxRate = (value: string | undefined) => {
  const taxValue = parseNumber(value)
  if (taxValue <= 0) {
    return 0
  }

  return taxValue <= 1 ? taxValue * 100 : taxValue
}

const priceTaxExcluded = (priceTaxIncl: number, taxRate: number) => {
  if (taxRate <= 0) {
    return priceTaxIncl
  }

  return priceTaxIncl / (1 + taxRate / 100)
}

const slugify = (value: string) => {
  const slug = normalizeLookup(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'import'
}

const splitCustomerName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstname: 'Client', lastname: 'Import' }
  }

  if (parts.length === 1) {
    return { firstname: parts[0], lastname: parts[0] }
  }

  return {
    firstname: parts[0],
    lastname: parts.slice(1).join(' '),
  }
}

const optionValueKey = (groupId: string, valueName: string) =>
  `${groupId}:${normalizeLookup(valueName)}`

const combinationKey = (reference: string, optionValue: string) =>
  `${normalizeLookup(reference)}:${normalizeLookup(optionValue)}`

const getTableRecords = (tables: ParsedImportTable[], resourceName: string) =>
  tables.find((table) => table.resourceName === resourceName)?.records ?? []

export const hasStructuredPrestashopImport = (tables: ParsedImportTable[]) => {
  const resourceNames = new Set(tables.map((table) => table.resourceName))
  return (
    resourceNames.has('products') ||
    resourceNames.has('combinations') ||
    resourceNames.has('orders')
  )
}

const getConfigurationValue = async (name: string, fallback: string) => {
  const configuration = await fetchResourceByField('configurations', 'name', name)
  return valueAsString(configuration?.value) || fallback
}

const loadDefaults = async (): Promise<ImportDefaults> => {
  const carriers = await fetchResourceListFromEndpoint(
    'carriers?display=[id]&filter[deleted]=[0]&filter[active]=[1]&limit=1',
    'carriers',
  )

  return {
    langId: await getConfigurationValue('PS_LANG_DEFAULT', DEFAULT_LANG_ID),
    currencyId: await getConfigurationValue(
      'PS_CURRENCY_DEFAULT',
      DEFAULT_CURRENCY_ID,
    ),
    countryId: await getConfigurationValue(
      'PS_COUNTRY_DEFAULT',
      DEFAULT_COUNTRY_ID,
    ),
    shopId: await getConfigurationValue('PS_SHOP_DEFAULT', DEFAULT_SHOP_ID),
    shopGroupId: DEFAULT_SHOP_GROUP_ID,
    carrierId: valueAsString(carriers[0]?.id) || DEFAULT_CARRIER_ID,
    customerGroupId: DEFAULT_CUSTOMER_GROUP_ID,
  }
}

const buildContext = async (): Promise<ImportContext> => {
  const defaults = await loadDefaults()
  const context: ImportContext = {
    defaults,
    categoryIdsByName: new Map(),
    taxIdsByRate: new Map(),
    taxGroupIdsByRate: new Map(),
    optionGroupIdsByName: new Map(),
    optionValueIdsByKey: new Map(),
    productsByReference: new Map(),
    combinationsByProductAndValue: new Map(),
  }

  const [categories, taxes, taxGroups, optionGroups, optionValues] =
    await Promise.all([
      fetchResourceListFromEndpoint('categories?display=full', 'categories'),
      fetchResourceListFromEndpoint('taxes?display=full', 'taxes'),
      fetchResourceListFromEndpoint(
        'tax_rule_groups?display=full',
        'tax_rule_groups',
      ),
      fetchResourceListFromEndpoint(
        'product_options?display=full',
        'product_options',
      ),
      fetchResourceListFromEndpoint(
        'product_option_values?display=full',
        'product_option_values',
      ),
    ])

  categories.forEach((category) => {
    const name = valueAsString(category.name)
    const id = valueAsString(category.id)
    if (name && id) {
      context.categoryIdsByName.set(normalizeLookup(name), id)
    }
  })

  taxes.forEach((tax) => {
    const rate = parseNumber(valueAsString(tax.rate))
    const id = valueAsString(tax.id)
    if (id) {
      context.taxIdsByRate.set(formatDecimal(rate, 4), id)
    }
  })

  taxGroups.forEach((taxGroup) => {
    const name = valueAsString(taxGroup.name)
    const id = valueAsString(taxGroup.id)
    if (name && id) {
      context.taxGroupIdsByRate.set(normalizeLookup(name), id)
    }
  })

  optionGroups.forEach((optionGroup) => {
    const name = valueAsString(optionGroup.name)
    const id = valueAsString(optionGroup.id)
    if (name && id) {
      context.optionGroupIdsByName.set(normalizeLookup(name), id)
    }
  })

  optionValues.forEach((optionValue) => {
    const name = valueAsString(optionValue.name)
    const groupId = valueAsString(optionValue.id_attribute_group)
    const id = valueAsString(optionValue.id)
    if (name && groupId && id) {
      context.optionValueIdsByKey.set(optionValueKey(groupId, name), id)
    }
  })

  return context
}

const createOrUpdateResource = async (
  resourcePlural: string,
  lookupField: string,
  lookupValue: string,
  payload: Record<string, unknown>,
) => {
  const existingResource = await fetchResourceByField(
    resourcePlural,
    lookupField,
    lookupValue,
  )
  const existingId = valueAsString(existingResource?.id)

  if (existingId) {
    return updateResourceFromRecord(resourcePlural, existingId, payload)
  }

  const createdId = await createResourceFromRecord(resourcePlural, payload)
  if (createdId) {
    return createdId
  }

  const createdResource = await fetchResourceByField(
    resourcePlural,
    lookupField,
    lookupValue,
  )
  return valueAsString(createdResource?.id)
}

const ensureCategory = async (name: string, context: ImportContext) => {
  const key = normalizeLookup(name)
  const cachedCategoryId = context.categoryIdsByName.get(key)

  if (cachedCategoryId) {
    return cachedCategoryId
  }

  const categoryId = await createResourceFromRecord('categories', {
    id_parent: ROOT_CATEGORY_ID,
    active: '1',
    name: localized(name, context.defaults.langId),
    link_rewrite: localized(slugify(name), context.defaults.langId),
  })

  context.categoryIdsByName.set(key, categoryId)
  return categoryId
}

const ensureTaxGroup = async (taxRate: number, context: ImportContext) => {
  if (taxRate <= 0) {
    return '0'
  }

  const rateKey = formatDecimal(taxRate, 4)
  const taxName = `Taxe ${formatDecimal(taxRate, 2)}%`
  const taxGroupKey = normalizeLookup(taxName)
  const cachedTaxGroupId =
    context.taxGroupIdsByRate.get(rateKey) ??
    context.taxGroupIdsByRate.get(taxGroupKey)

  if (cachedTaxGroupId) {
    return cachedTaxGroupId
  }

  let taxId = context.taxIdsByRate.get(rateKey)
  if (!taxId) {
    taxId = await createResourceFromRecord('taxes', {
      rate: formatDecimal(taxRate, 4),
      active: '1',
      deleted: '0',
      name: localized(taxName, context.defaults.langId),
    })
    context.taxIdsByRate.set(rateKey, taxId)
  }

  const taxGroupId = await createResourceFromRecord('tax_rule_groups', {
    name: taxName,
    active: '1',
    deleted: '0',
  })

  await createResourceFromRecord('tax_rules', {
    id_tax_rules_group: taxGroupId,
    id_country: context.defaults.countryId,
    id_state: '0',
    zipcode_from: '0',
    zipcode_to: '0',
    id_tax: taxId,
    behavior: '0',
    description: taxName,
  })

  context.taxGroupIdsByRate.set(rateKey, taxGroupId)
  context.taxGroupIdsByRate.set(taxGroupKey, taxGroupId)
  return taxGroupId
}

const importProducts = async (
  records: SpreadsheetRecord[],
  context: ImportContext,
) => {
  let importedCount = 0

  for (const record of records) {
    const reference = record.reference?.trim()
    const name = record.name?.trim()
    if (!reference || !name) {
      continue
    }

    const categoryName = record.categorie?.trim() || 'Accueil'
    const categoryId = await ensureCategory(categoryName, context)
    const taxRate = normalizeTaxRate(record.taxe)
    const taxGroupId = await ensureTaxGroup(taxRate, context)
    const priceTaxIncl = parseNumber(record.price)
    const priceTaxExcl = priceTaxExcluded(priceTaxIncl, taxRate)

    const productPayload = {
      id_category_default: categoryId,
      id_tax_rules_group: taxGroupId,
      type: 'simple',
      id_shop_default: context.defaults.shopId,
      reference,
      price: formatPrice(priceTaxExcl),
      wholesale_price: formatPrice(parseNumber(record.wholesale_price)),
      active: '1',
      available_for_order: '1',
      available_date: normalizeDate(record.available_date),
      show_price: '1',
      indexed: '1',
      state: '1',
      minimal_quantity: '1',
      visibility: 'both',
      name: localized(name, context.defaults.langId),
      link_rewrite: localized(slugify(name), context.defaults.langId),
      associations: {
        categories: {
          category: [{ id: ROOT_CATEGORY_ID }, { id: categoryId }],
        },
      },
    }

    const productId = await createOrUpdateResource(
      'products',
      'reference',
      reference,
      productPayload,
    )

    context.productsByReference.set(normalizeLookup(reference), {
      id: productId,
      reference,
      name,
      priceTaxIncl,
      priceTaxExcl,
      taxRate,
    })
    importedCount += 1
  }

  return importedCount
}

const ensureOptionGroup = async (name: string, context: ImportContext) => {
  const key = normalizeLookup(name)
  const cachedOptionGroupId = context.optionGroupIdsByName.get(key)
  if (cachedOptionGroupId) {
    return cachedOptionGroupId
  }

  const groupType = key.includes('couleur') ? 'color' : 'select'
  const optionGroupId = await createResourceFromRecord('product_options', {
    is_color_group: groupType === 'color' ? '1' : '0',
    group_type: groupType,
    position: '0',
    name: localized(name, context.defaults.langId),
    public_name: localized(name, context.defaults.langId),
  })

  context.optionGroupIdsByName.set(key, optionGroupId)
  return optionGroupId
}

const ensureOptionValue = async (
  optionGroupId: string,
  valueName: string,
  context: ImportContext,
) => {
  const key = optionValueKey(optionGroupId, valueName)
  const cachedOptionValueId = context.optionValueIdsByKey.get(key)
  if (cachedOptionValueId) {
    return cachedOptionValueId
  }

  const optionValueId = await createResourceFromRecord('product_option_values', {
    id_attribute_group: optionGroupId,
    position: '0',
    name: localized(valueName, context.defaults.langId),
  })

  context.optionValueIdsByKey.set(key, optionValueId)
  return optionValueId
}

const ensureStock = async (
  productId: string,
  productAttributeId: string,
  quantity: string,
  context: ImportContext,
) => {
  const existingStock = await fetchResourceByFilters('stock_availables', {
    id_product: productId,
    id_product_attribute: productAttributeId,
  })
  const stockPayload = {
    id_product: productId,
    id_product_attribute: productAttributeId,
    id_shop: context.defaults.shopId,
    id_shop_group: '0',
    quantity: String(Math.round(parseNumber(quantity))),
    depends_on_stock: '0',
    out_of_stock: '2',
  }
  const stockId = valueAsString(existingStock?.id)

  if (stockId) {
    await updateResourceFromRecord('stock_availables', stockId, stockPayload)
    return stockId
  }

  return createResourceFromRecord('stock_availables', stockPayload)
}

const importCombinationsAndStock = async (
  records: SpreadsheetRecord[],
  context: ImportContext,
) => {
  let combinationCount = 0
  let stockCount = 0
  const defaultCombinationByProduct = new Set<string>()

  for (const record of records) {
    const reference = record.reference?.trim()
    if (!reference) {
      continue
    }

    const product = context.productsByReference.get(normalizeLookup(reference))
    if (!product) {
      throw new Error(`Produit introuvable pour la reference ${reference}`)
    }

    const optionGroupName = record.specificite?.trim()
    const optionValueName = record.karazany?.trim()
    const quantity = record.quantity || '0'

    if (!optionGroupName || !optionValueName) {
      await ensureStock(product.id, '0', quantity, context)
      stockCount += 1
      continue
    }

    const optionGroupId = await ensureOptionGroup(optionGroupName, context)
    const optionValueId = await ensureOptionValue(
      optionGroupId,
      optionValueName,
      context,
    )
    const combinationReference = `${reference}-${slugify(optionValueName)}`
    const priceTaxIncl = parseNumber(record.price, product.priceTaxIncl)
    const priceTaxExcl = priceTaxExcluded(priceTaxIncl, product.taxRate)
    const priceImpact = priceTaxExcl - product.priceTaxExcl
    const isDefaultCombination = !defaultCombinationByProduct.has(product.id)

    const combinationPayload = {
      id_product: product.id,
      reference: combinationReference,
      price: formatPrice(priceImpact),
      minimal_quantity: '1',
      default_on: isDefaultCombination ? '1' : '0',
      associations: {
        product_option_values: {
          product_option_value: [{ id: optionValueId }],
        },
      },
    }

    const existingCombination = await fetchResourceByField(
      'combinations',
      'reference',
      combinationReference,
    )
    const existingCombinationId = valueAsString(existingCombination?.id)
    const combinationId = existingCombinationId
      ? await updateResourceFromRecord(
          'combinations',
          existingCombinationId,
          combinationPayload,
        )
      : await createResourceFromRecord('combinations', combinationPayload)

    defaultCombinationByProduct.add(product.id)
    context.combinationsByProductAndValue.set(
      combinationKey(reference, optionValueName),
      {
        id: combinationId,
        productId: product.id,
        productReference: reference,
        optionValue: optionValueName,
        priceTaxIncl,
        priceTaxExcl,
      },
    )
    await ensureStock(product.id, combinationId, quantity, context)
    combinationCount += 1
    stockCount += 1
  }

  return { combinationCount, stockCount }
}

const parsePurchaseList = (value: string) => {
  const purchases: Array<{
    reference: string
    quantity: number
    optionValue: string
  }> = []
  const itemPattern = /\("([^"]+)";\s*([0-9.]+);\s*"([^"]*)"\)/g

  for (const match of value.matchAll(itemPattern)) {
    purchases.push({
      reference: match[1],
      quantity: Math.round(parseNumber(match[2], 1)),
      optionValue: match[3],
    })
  }

  return purchases
}

const resolveOrderState = (value: string | undefined) => {
  const normalizedState = normalizeLookup(value ?? '')

  if (normalizedState.includes('annul')) {
    return '6'
  }

  if (normalizedState.includes('echec') || normalizedState.includes('erreur')) {
    return '8'
  }

  if (normalizedState.includes('accept') || normalizedState.includes('effectu')) {
    return '2'
  }

  return '1'
}

const createCustomer = async (
  record: SpreadsheetRecord,
  context: ImportContext,
) => {
  const email = record.email?.trim()
  if (!email) {
    throw new Error('Commande sans email client')
  }

  const existingCustomer = await fetchResourceByField('customers', 'email', email)
  const existingCustomerId = valueAsString(existingCustomer?.id)
  if (existingCustomerId) {
    return existingCustomerId
  }

  const { firstname, lastname } = splitCustomerName(record.name ?? '')
  return createResourceFromRecord('customers', {
    id_default_group: context.defaults.customerGroupId,
    id_lang: context.defaults.langId,
    passwd: record.passwd || record.pwd || 'import123',
    lastname,
    firstname,
    email,
    active: '1',
    deleted: '0',
    is_guest: '0',
    id_shop: context.defaults.shopId,
    id_shop_group: context.defaults.shopGroupId,
  })
}

const createAddress = async (
  record: SpreadsheetRecord,
  customerId: string,
  context: ImportContext,
) => {
  const { firstname, lastname } = splitCustomerName(record.name ?? '')
  const address = record.adresse?.trim() || 'Adresse import'

  return createResourceFromRecord('addresses', {
    id_customer: customerId,
    id_country: context.defaults.countryId,
    alias: 'Adresse import',
    lastname,
    firstname,
    address1: address,
    city: address,
    deleted: '0',
  })
}

const resolveOrderLine = (
  purchase: ReturnType<typeof parsePurchaseList>[number],
  context: ImportContext,
) => {
  const product = context.productsByReference.get(normalizeLookup(purchase.reference))
  if (!product) {
    throw new Error(`Produit commande introuvable: ${purchase.reference}`)
  }

  const combination = purchase.optionValue
    ? context.combinationsByProductAndValue.get(
        combinationKey(purchase.reference, purchase.optionValue),
      )
    : null
  const unitPriceTaxIncl = combination?.priceTaxIncl ?? product.priceTaxIncl
  const unitPriceTaxExcl = combination?.priceTaxExcl ?? product.priceTaxExcl
  const productName = combination
    ? `${product.name} - ${combination.optionValue}`
    : product.name

  return {
    productId: product.id,
    productAttributeId: combination?.id ?? '0',
    quantity: purchase.quantity,
    productName,
    productReference: product.reference,
    unitPriceTaxIncl,
    unitPriceTaxExcl,
  }
}

const importOrders = async (
  records: SpreadsheetRecord[],
  context: ImportContext,
) => {
  let orderCount = 0

  for (const record of records) {
    const purchases = parsePurchaseList(record.achat ?? '')
    if (purchases.length === 0) {
      continue
    }

    const customerId = await createCustomer(record, context)
    const addressId = await createAddress(record, customerId, context)
    const orderLines = purchases.map((purchase) =>
      resolveOrderLine(purchase, context),
    )
    const totalTaxIncl = orderLines.reduce(
      (sum, line) => sum + line.unitPriceTaxIncl * line.quantity,
      0,
    )
    const totalTaxExcl = orderLines.reduce(
      (sum, line) => sum + line.unitPriceTaxExcl * line.quantity,
      0,
    )

    const cartId = await createResourceFromRecord('carts', {
      id_address_delivery: addressId,
      id_address_invoice: addressId,
      id_currency: context.defaults.currencyId,
      id_customer: customerId,
      id_lang: context.defaults.langId,
      id_shop: context.defaults.shopId,
      id_carrier: context.defaults.carrierId,
      recyclable: '0',
      gift: '0',
      mobile_theme: '0',
      allow_seperated_package: '0',
      date_add: toDateTime(record.date),
      date_upd: toDateTime(record.date),
      associations: {
        cart_rows: {
          cart_row: orderLines.map((line) => ({
            id_product: line.productId,
            id_product_attribute: line.productAttributeId,
            id_address_delivery: addressId,
            id_customization: '0',
            quantity: String(line.quantity),
          })),
        },
      },
    })

    const orderStateId = resolveOrderState(record.current_state)
    const isPaidOrder = orderStateId === '2'
    await createResourceFromRecord('orders', {
      id_address_delivery: addressId,
      id_address_invoice: addressId,
      id_cart: cartId,
      id_currency: context.defaults.currencyId,
      id_lang: context.defaults.langId,
      id_customer: customerId,
      id_carrier: context.defaults.carrierId,
      current_state: orderStateId,
      module: DEFAULT_PAYMENT_MODULE,
      valid: isPaidOrder ? '1' : '0',
      date_add: toDateTime(record.date),
      date_upd: toDateTime(record.date),
      id_shop: context.defaults.shopId,
      payment: record.current_state || 'Paiement manuel',
      total_discounts: '0',
      total_discounts_tax_incl: '0',
      total_discounts_tax_excl: '0',
      total_paid: formatPrice(totalTaxIncl),
      total_paid_tax_incl: formatPrice(totalTaxIncl),
      total_paid_tax_excl: formatPrice(totalTaxExcl),
      total_paid_real: isPaidOrder ? formatPrice(totalTaxIncl) : '0',
      total_products: formatPrice(totalTaxExcl),
      total_products_wt: formatPrice(totalTaxIncl),
      total_shipping: '0',
      total_shipping_tax_incl: '0',
      total_shipping_tax_excl: '0',
      carrier_tax_rate: '0',
      conversion_rate: '1',
      associations: {
        order_rows: {
          order_row: orderLines.map((line) => ({
            product_id: line.productId,
            product_attribute_id: line.productAttributeId,
            product_quantity: String(line.quantity),
            product_name: line.productName,
            product_reference: line.productReference,
            product_price: formatPrice(line.unitPriceTaxExcl),
            unit_price_tax_incl: formatPrice(line.unitPriceTaxIncl),
            unit_price_tax_excl: formatPrice(line.unitPriceTaxExcl),
          })),
        },
      },
    })

    orderCount += 1
  }

  return orderCount
}

export const importStructuredPrestashopData = async (
  tables: ParsedImportTable[],
) => {
  const logs: string[] = []
  const productRecords = getTableRecords(tables, 'products')
  const combinationRecords = getTableRecords(tables, 'combinations')
  const orderRecords = getTableRecords(tables, 'orders')
  const context = await buildContext()

  if (productRecords.length > 0) {
    const productCount = await importProducts(productRecords, context)
    logs.push(`Produits: ${productCount} ligne(s) synchronisee(s)`)
  }

  if (combinationRecords.length > 0) {
    const { combinationCount, stockCount } = await importCombinationsAndStock(
      combinationRecords,
      context,
    )
    logs.push(
      `Declinaisons: ${combinationCount} creee(s)/mise(s) a jour, ${stockCount} stock(s) synchronise(s)`,
    )
  }

  if (orderRecords.length > 0) {
    const orderCount = await importOrders(orderRecords, context)
    logs.push(`Commandes: ${orderCount} commande(s) creee(s)`)
  }

  if (logs.length === 0) {
    logs.push('Aucune feuille reconnue dans le fichier import')
  }

  return logs
}
