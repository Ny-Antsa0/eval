import JSZip from 'jszip'
import type { ZipUpload } from './types'

export const parseZipUploads = async (file: File) => {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  const uploads: ZipUpload[] = []
  const warnings: string[] = []

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue
    const name = entry.name.split('/').pop() || entry.name
    const match = name.match(/(\d+)/)
    if (!match) {
      warnings.push(`- ${name}: ID produit introuvable`)
      continue
    }
    const productId = match[1]
    const blob = await entry.async('blob')
    uploads.push({
      productId,
      fileName: name,
      file: new File([blob], name),
    })
  }

  return { uploads, warnings }
}
