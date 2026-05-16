import { parseDate } from './formatters'

export type ProductDates = {
  dateAdd?: string
  dateUpd?: string
}

const HOURS_24 = 24 * 60 * 60 * 1000
const DAYS_7 = 7 * 24 * 60 * 60 * 1000

export const getProductLabels = ({ dateAdd, dateUpd }: ProductDates) => {
  const labels: string[] = []
  const now = Date.now()

  const addDate = dateAdd ? parseDate(dateAdd) : null
  const updDate = dateUpd ? parseDate(dateUpd) : null
  const referenceDate = updDate ?? addDate

  if (referenceDate && now - referenceDate.getTime() <= HOURS_24) {
    labels.push('HOT')
  }

  if (addDate && now - addDate.getTime() <= DAYS_7) {
    labels.push('NEW')
  }

  return labels
}
