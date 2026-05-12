export type BusyState = {
  reset: boolean
  csv: boolean
  zip: boolean
  orders: boolean
}

export type LogState = {
  reset: string[]
  csv: string[]
  zip: string[]
  orders: string[]
}

export type BusyKey = keyof BusyState
export type LogKey = keyof LogState

export type ZipUpload = {
  productId: string
  fileName: string
  file: File
}
