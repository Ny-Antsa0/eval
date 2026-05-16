import JSZip from 'jszip'

type ParsedTable = {
  headers: string[]
  records: Array<Record<string, string>>
}

export type ParsedImportTable = {
  sourceName: string
  resourceName: string
  records: Array<Record<string, string>>
}

// Alias pour harmoniser les entetes de tableur avec les champs PrestaShop.
const COMMON_FIELD_ALIASES: Record<string, string> = {
  nom: 'name',
  prix_ttc: 'price',
  prix_vente_ttc: 'price',
  prix_achat: 'wholesale_price',
  date_availability_produit: 'available_date',
  stock_initial: 'quantity',
  pwd: 'passwd',
  etat: 'current_state',
}

const RESOURCE_NAME_ALIASES: Record<string, string> = {
  produit: 'products',
  produits: 'products',
  product: 'products',
  products: 'products',
  declinaison: 'combinations',
  declinaisons: 'combinations',
  combination: 'combinations',
  combinations: 'combinations',
  commande: 'orders',
  commandes: 'orders',
  order: 'orders',
  orders: 'orders',
}

const OPEN_XML_EXCEL_EXTENSIONS = new Set(['xlsx', 'xlsm', 'xltx', 'xltm'])
const LEGACY_EXCEL_EXTENSIONS = new Set(['xls', 'xla', 'xlt'])
const UNSUPPORTED_BINARY_EXCEL_EXTENSIONS = new Set(['xlsb'])
const HTML_EXTENSIONS = new Set(['html', 'htm'])
const XML_EXTENSIONS = new Set(['xml'])

const BUILT_IN_DATE_FORMAT_IDS = new Set([
  '14',
  '15',
  '16',
  '17',
  '22',
  '27',
  '30',
  '36',
  '50',
  '57',
])

const RELATIONSHIP_NAMESPACE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

// Normalise les entetes: supprime accents, espaces et symboles.
const normalizeKey = (value: string) =>
  value
    .trim()
    .replace(/^\ufeff/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

const getFileExtension = (fileName: string) =>
  fileName.split('.').pop()?.toLowerCase() ?? ''

const stripFileExtension = (fileName: string) => fileName.replace(/\.[^.]+$/, '')

const resolveKnownResourceName = (sourceName: string) => {
  const normalizedSource = normalizeKey(stripFileExtension(sourceName))
  return RESOURCE_NAME_ALIASES[normalizedSource] ?? null
}

const detectResourceNameFromHeaders = (headers: string[]) => {
  const normalizedHeaders = new Set(headers.map(normalizeKey))

  if (
    normalizedHeaders.has('email') &&
    (normalizedHeaders.has('pwd') || normalizedHeaders.has('passwd')) &&
    normalizedHeaders.has('achat')
  ) {
    return 'orders'
  }

  if (
    normalizedHeaders.has('specificite') ||
    normalizedHeaders.has('karazany') ||
    normalizedHeaders.has('stock_initial') ||
    normalizedHeaders.has('prix_vente_ttc')
  ) {
    return 'combinations'
  }

  if (
    normalizedHeaders.has('date_availability_produit') ||
    normalizedHeaders.has('prix_ttc') ||
    normalizedHeaders.has('prix_achat') ||
    normalizedHeaders.has('categorie')
  ) {
    return 'products'
  }

  return null
}

// Deduire la ressource depuis le nom de fichier, le nom de feuille ou les entetes.
export const resolveResourceName = (
  sourceName: string,
  headers: string[] = [],
  fallbackName?: string,
) => {
  const knownFromSource = resolveKnownResourceName(sourceName)
  if (knownFromSource) {
    return knownFromSource
  }

  const knownFromHeaders = detectResourceNameFromHeaders(headers)
  if (knownFromHeaders) {
    return knownFromHeaders
  }

  if (fallbackName) {
    const knownFromFallback = resolveKnownResourceName(fallbackName)
    if (knownFromFallback) {
      return knownFromFallback
    }
  }

  return normalizeKey(stripFileExtension(sourceName))
}

// Convertit une colonne de tableur en champ de l'API.
const resolveFieldName = (fieldName: string) => {
  const normalized = normalizeKey(fieldName)
  return COMMON_FIELD_ALIASES[normalized] ?? normalized
}

// Parse une ligne CSV/TSV avec gestion des guillemets doubles.
const parseDelimitedLine = (line: string, delimiter: string) => {
  const values: string[] = []
  let currentValue = ''
  let isInsideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (isInsideQuotes && line[index + 1] === '"') {
        currentValue += '"'
        index += 1
      } else {
        isInsideQuotes = !isInsideQuotes
      }
      continue
    }

    if (character === delimiter && !isInsideQuotes) {
      values.push(currentValue.trim())
      currentValue = ''
      continue
    }

    currentValue += character
  }

  values.push(currentValue.trim())
  return values
}

// Deduit le delimiteur en comparant tabulation, ';' et ','.
const detectDelimiter = (headerLine: string) => {
  const candidates = ['\t', ';', ',']

  return candidates.reduce((bestDelimiter, currentDelimiter) => {
    const bestCount = headerLine.split(bestDelimiter).length
    const currentCount = headerLine.split(currentDelimiter).length
    return currentCount > bestCount ? currentDelimiter : bestDelimiter
  }, ';')
}

// Associe chaque valeur a son entete normalisee.
const buildRecord = (headers: string[], values: string[]) => {
  const record: Record<string, string> = {}

  headers.forEach((header, index) => {
    const resolvedFieldName = resolveFieldName(header)
    if (!resolvedFieldName) {
      return
    }

    record[resolvedFieldName] = values[index]?.trim() ?? ''
  })

  return record
}

const rowHasContent = (row: string[]) =>
  row.some((value) => value.trim().length > 0)

const parseTableRows = (rows: string[][]): ParsedTable => {
  const nonEmptyRows = rows.filter(rowHasContent)
  if (nonEmptyRows.length === 0) {
    return { headers: [], records: [] }
  }

  const headers = nonEmptyRows[0].map((header) => header.trim())
  const records = nonEmptyRows.slice(1).map((row) => buildRecord(headers, row))

  return { headers, records }
}

// Convertit un tableau de lignes texte en tableau d'objets.
const parseDelimitedLines = (lines: string[]) => {
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  if (nonEmptyLines.length === 0) {
    return { headers: [], records: [] }
  }

  const delimiter = detectDelimiter(nonEmptyLines[0])
  const rows = nonEmptyLines.map((line) => parseDelimitedLine(line, delimiter))
  return parseTableRows(rows)
}

// Lecture en flux pour limiter la memoire sur les gros fichiers texte.
const readDelimitedLinesWithStream = async (file: File) => {
  if (typeof TextDecoderStream === 'undefined') {
    return null
  }

  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader()
  const lines: string[] = []
  let pendingChunk = ''

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    pendingChunk += value
    const extractedLines = pendingChunk.split(/\r?\n/)
    pendingChunk = extractedLines.pop() ?? ''
    lines.push(...extractedLines)
  }

  if (pendingChunk.trim().length > 0) {
    lines.push(pendingChunk)
  }

  return lines
}

const parseDelimitedFile = async (file: File) => {
  const streamedLines = await readDelimitedLinesWithStream(file)
  if (streamedLines) {
    return parseDelimitedLines(streamedLines)
  }

  return parseDelimitedLines((await file.text()).split(/\r?\n/))
}

const parseXmlDocument = (content: string, sourceName: string) => {
  const document = new DOMParser().parseFromString(content, 'application/xml')

  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error(`${sourceName}: XML invalide`)
  }

  return document
}

const readZipXml = async (zip: JSZip, path: string) => {
  const entry = zip.file(path)
  if (!entry) {
    throw new Error(`${path}: introuvable dans le fichier Excel`)
  }

  return parseXmlDocument(await entry.async('text'), path)
}

const readOptionalZipXml = async (zip: JSZip, path: string) => {
  const entry = zip.file(path)
  if (!entry) {
    return null
  }

  return parseXmlDocument(await entry.async('text'), path)
}

const getAttribute = (element: Element, ...attributeNames: string[]) => {
  for (const attributeName of attributeNames) {
    const value = element.getAttribute(attributeName)
    if (value) {
      return value
    }
  }

  return ''
}

const getRelationshipId = (element: Element) =>
  getAttribute(element, 'r:id') ||
  element.getAttributeNS(RELATIONSHIP_NAMESPACE, 'id') ||
  ''

const readSharedStrings = async (zip: JSZip) => {
  const sharedStringsDocument = await readOptionalZipXml(
    zip,
    'xl/sharedStrings.xml',
  )

  if (!sharedStringsDocument) {
    return []
  }

  return Array.from(sharedStringsDocument.getElementsByTagName('si')).map(
    (sharedString) =>
      Array.from(sharedString.getElementsByTagName('t'))
        .map((textNode) => textNode.textContent ?? '')
        .join(''),
  )
}

const isDateFormatCode = (formatCode: string) => {
  const normalizedFormat = formatCode.toLowerCase()
  return /[dmy]/.test(normalizedFormat) && !/^\[?[hms]+\]?$/i.test(formatCode)
}

const readDateStyleIndexes = async (zip: JSZip) => {
  const stylesDocument = await readOptionalZipXml(zip, 'xl/styles.xml')
  const dateStyleIndexes = new Set<string>()

  if (!stylesDocument) {
    return dateStyleIndexes
  }

  const customDateFormatIds = new Set<string>()
  Array.from(stylesDocument.getElementsByTagName('numFmt')).forEach((numFmt) => {
    const id = getAttribute(numFmt, 'numFmtId')
    const formatCode = getAttribute(numFmt, 'formatCode')
    if (id && isDateFormatCode(formatCode)) {
      customDateFormatIds.add(id)
    }
  })

  const cellXfs = stylesDocument.getElementsByTagName('cellXfs')[0]
  Array.from(cellXfs?.getElementsByTagName('xf') ?? []).forEach((xf, index) => {
    const numFmtId = getAttribute(xf, 'numFmtId')
    if (
      BUILT_IN_DATE_FORMAT_IDS.has(numFmtId) ||
      customDateFormatIds.has(numFmtId)
    ) {
      dateStyleIndexes.add(String(index))
    }
  })

  return dateStyleIndexes
}

const excelSerialDateToIsoDate = (value: string) => {
  const serialDate = Number(value)
  if (!Number.isFinite(serialDate)) {
    return value
  }

  const unixTimestamp = Math.round((serialDate - 25569) * 86400 * 1000)
  return new Date(unixTimestamp).toISOString().slice(0, 10)
}

const columnNameToIndex = (cellReference: string) => {
  const columnName = cellReference.match(/[A-Z]+/i)?.[0] ?? ''
  let columnIndex = 0

  for (const letter of columnName.toUpperCase()) {
    columnIndex = columnIndex * 26 + letter.charCodeAt(0) - 64
  }

  return Math.max(columnIndex - 1, 0)
}

const readOpenXmlCellValue = (
  cell: Element,
  sharedStrings: string[],
  dateStyleIndexes: Set<string>,
) => {
  const cellType = getAttribute(cell, 't')
  const rawValue = cell.getElementsByTagName('v')[0]?.textContent ?? ''

  if (cellType === 's') {
    return sharedStrings[Number(rawValue)] ?? ''
  }

  if (cellType === 'inlineStr') {
    return Array.from(cell.getElementsByTagName('t'))
      .map((textNode) => textNode.textContent ?? '')
      .join('')
  }

  if (cellType === 'b') {
    return rawValue === '1' ? 'TRUE' : 'FALSE'
  }

  if (rawValue && dateStyleIndexes.has(getAttribute(cell, 's'))) {
    return excelSerialDateToIsoDate(rawValue)
  }

  return rawValue
}

const parseOpenXmlWorksheet = (
  worksheetDocument: XMLDocument,
  sharedStrings: string[],
  dateStyleIndexes: Set<string>,
) => {
  return Array.from(worksheetDocument.getElementsByTagName('row')).map((row) => {
    const values: string[] = []

    Array.from(row.getElementsByTagName('c')).forEach((cell) => {
      const cellReference = getAttribute(cell, 'r')
      const columnIndex = columnNameToIndex(cellReference)
      values[columnIndex] = readOpenXmlCellValue(
        cell,
        sharedStrings,
        dateStyleIndexes,
      )
    })

    return values.map((value) => value ?? '')
  })
}

const buildWorkbookRelationshipMap = (relationshipsDocument: XMLDocument) => {
  const relationships = new Map<string, string>()

  Array.from(relationshipsDocument.getElementsByTagName('Relationship')).forEach(
    (relationship) => {
      const id = getAttribute(relationship, 'Id')
      const target = getAttribute(relationship, 'Target')
      if (id && target) {
        relationships.set(id, target)
      }
    },
  )

  return relationships
}

const normalizeWorkbookTarget = (target: string) => {
  const cleanTarget = target.replace(/^\/+/, '')
  if (cleanTarget.startsWith('xl/')) {
    return cleanTarget
  }

  return `xl/${cleanTarget}`
}

const buildImportTable = (
  sourceName: string,
  resourceSourceName: string,
  parsedTable: ParsedTable,
  fallbackName?: string,
): ParsedImportTable => ({
  sourceName,
  resourceName: resolveResourceName(
    resourceSourceName,
    parsedTable.headers,
    fallbackName,
  ),
  records: parsedTable.records,
})

const parseOpenXmlWorkbook = async (file: File): Promise<ParsedImportTable[]> => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const workbookDocument = await readZipXml(zip, 'xl/workbook.xml')
  const relationshipsDocument = await readZipXml(zip, 'xl/_rels/workbook.xml.rels')
  const relationships = buildWorkbookRelationshipMap(relationshipsDocument)
  const sharedStrings = await readSharedStrings(zip)
  const dateStyleIndexes = await readDateStyleIndexes(zip)
  const tables: ParsedImportTable[] = []

  for (const sheet of Array.from(workbookDocument.getElementsByTagName('sheet'))) {
    const sheetName = getAttribute(sheet, 'name') || 'Feuille'
    const relationshipId = getRelationshipId(sheet)
    const target = relationships.get(relationshipId)

    if (!target) {
      continue
    }

    const worksheetDocument = await readZipXml(
      zip,
      normalizeWorkbookTarget(target),
    )
    const rows = parseOpenXmlWorksheet(
      worksheetDocument,
      sharedStrings,
      dateStyleIndexes,
    )
    const parsedTable = parseTableRows(rows)

    if (parsedTable.headers.length > 0) {
      tables.push(
        buildImportTable(
          `${file.name} / ${sheetName}`,
          sheetName,
          parsedTable,
          file.name,
        ),
      )
    }
  }

  return tables
}

const parseHtmlSpreadsheet = (content: string, fileName: string) => {
  const document = new DOMParser().parseFromString(content, 'text/html')
  const tables = Array.from(document.querySelectorAll('table'))

  return tables.flatMap((table, index) => {
    const rows = Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('th,td')).map(
        (cell) => cell.textContent?.trim() ?? '',
      ),
    )
    const parsedTable = parseTableRows(rows)

    if (parsedTable.headers.length === 0) {
      return []
    }

    const tableName = tables.length > 1 ? `table${index + 1}` : fileName
    return [buildImportTable(tableName, tableName, parsedTable, fileName)]
  })
}

const parseXmlSpreadsheet = (content: string, fileName: string) => {
  const document = parseXmlDocument(content, fileName)
  const worksheets = Array.from(document.getElementsByTagName('Worksheet'))

  return worksheets.flatMap((worksheet, index) => {
    const worksheetName =
      getAttribute(worksheet, 'ss:Name', 'Name') || `Feuille${index + 1}`
    const rows = Array.from(worksheet.getElementsByTagName('Row')).map((row) => {
      const values: string[] = []
      let columnIndex = 0

      Array.from(row.getElementsByTagName('Cell')).forEach((cell) => {
        const indexedColumn = Number(getAttribute(cell, 'ss:Index', 'Index'))
        if (Number.isFinite(indexedColumn) && indexedColumn > 0) {
          columnIndex = indexedColumn - 1
        }

        values[columnIndex] =
          cell.getElementsByTagName('Data')[0]?.textContent?.trim() ?? ''
        columnIndex += 1
      })

      return values
    })
    const parsedTable = parseTableRows(rows)

    if (parsedTable.headers.length === 0) {
      return []
    }

    return [
      buildImportTable(
        `${fileName} / ${worksheetName}`,
        worksheetName,
        parsedTable,
        fileName,
      ),
    ]
  })
}

const parseLegacySpreadsheetFile = async (file: File) => {
  const content = await file.text()
  const normalizedStart = content.trimStart().slice(0, 500).toLowerCase()

  if (normalizedStart.includes('<html') || normalizedStart.includes('<table')) {
    return parseHtmlSpreadsheet(content, file.name)
  }

  if (normalizedStart.includes('<workbook')) {
    return parseXmlSpreadsheet(content, file.name)
  }

  throw new Error(
    'Format .xls binaire non pris en charge directement. Enregistrez le fichier en .xlsx ou .csv.',
  )
}

// Parse direct depuis une chaine (fallback et tests simples).
export const parseCsv = (content: string) =>
  parseDelimitedLines(content.split(/\r?\n/)).records

// Tente une lecture stream, sinon retombe sur file.text().
export const parseCsvFile = async (file: File) => {
  const parsedTable = await parseDelimitedFile(file)
  return parsedTable.records
}

export const parseImportFile = async (
  file: File,
): Promise<ParsedImportTable[]> => {
  const extension = getFileExtension(file.name)

  if (OPEN_XML_EXCEL_EXTENSIONS.has(extension)) {
    return parseOpenXmlWorkbook(file)
  }

  if (LEGACY_EXCEL_EXTENSIONS.has(extension)) {
    return parseLegacySpreadsheetFile(file)
  }

  if (UNSUPPORTED_BINARY_EXCEL_EXTENSIONS.has(extension)) {
    throw new Error(
      `Format .${extension} non pris en charge directement. Enregistrez le fichier en .xlsx ou .csv.`,
    )
  }

  if (HTML_EXTENSIONS.has(extension)) {
    return parseHtmlSpreadsheet(await file.text(), file.name)
  }

  if (XML_EXTENSIONS.has(extension)) {
    return parseXmlSpreadsheet(await file.text(), file.name)
  }

  const parsedTable = await parseDelimitedFile(file)
  return [buildImportTable(file.name, file.name, parsedTable)]
}

// Nettoie les champs vides et corrige les alias particuliers.
export const sanitizeRecord = (
  resourceName: string,
  record: Record<string, string>,
) => {
  const sanitizedEntries = Object.entries(record).flatMap(([fieldName, value]) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return []
    }

    // Compat categorie: mappe category -> name.
    if (resourceName === 'categories' && fieldName === 'category') {
      return [['name', trimmedValue] as const]
    }

    return [[fieldName, trimmedValue] as const]
  })

  return Object.fromEntries(sanitizedEntries)
}
