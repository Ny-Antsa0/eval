export const readXmlText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => readXmlText(item)).filter(Boolean).join(', ')
  }

  if (typeof value === 'object') {
    const nested = value as Record<string, unknown>

    if (typeof nested['#text'] === 'string' || typeof nested['#text'] === 'number') {
      return String(nested['#text'])
    }

    if (nested.language !== undefined) {
      return readXmlText(nested.language)
    }

    for (const child of Object.values(nested)) {
      const text = readXmlText(child)
      if (text) {
        return text
      }
    }
  }

  return ''
}
