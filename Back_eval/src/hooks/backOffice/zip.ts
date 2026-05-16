import JSZip from 'jszip'
import type { ZipUpload } from './types'

// Filtre pour ignorer les fichiers non images.
const IMAGE_FILE_PATTERN = /\.(gif|jpe?g|png|webp)$/i
const IGNORED_ENTRY_PATTERN = /(^|\/)(\.ds_store|thumbs\.db)$/i

const isSystemEntry = (path: string) =>
  path.startsWith('__MACOSX/') || IGNORED_ENTRY_PATTERN.test(path)

const getFileName = (path: string) => path.split('/').filter(Boolean).pop() || path

// Fallback MIME base sur l'extension (zip fournit parfois un type vide).
const guessMimeType = (fileName: string) => {
  const lowerCaseFileName = fileName.toLowerCase()

  if (lowerCaseFileName.endsWith('.png')) return 'image/png'
  if (lowerCaseFileName.endsWith('.webp')) return 'image/webp'
  if (lowerCaseFileName.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

// Extrait les images et associe l'ID produit depuis le prefixe du nom.
export const parseZipUploads = async (archiveFile: File) => {
  const archiveBuffer = await archiveFile.arrayBuffer()
  const zip = await JSZip.loadAsync(archiveBuffer)
  const uploads: ZipUpload[] = []
  const warnings: string[] = []

  for (const entry of Object.values(zip.files)) {
    // Ignore les dossiers internes.
    if (entry.dir) {
      continue
    }

    if (isSystemEntry(entry.name)) {
      continue
    }

    const fileName = getFileName(entry.name)
    if (!IMAGE_FILE_PATTERN.test(fileName)) {
      warnings.push(`- ${entry.name}: ignore, format image non supporte`)
      continue
    }

    // ID produit cherche dans le nom (prefixe recommande, mais fallback autorise).
    const leadingMatch = fileName.match(/^(\d+)/)
    const anyMatch = fileName.match(/(\d+)/)
    const productMatch = leadingMatch ?? anyMatch
    if (!productMatch) {
      warnings.push(`- ${entry.name}: ID produit introuvable dans le nom`)
      continue
    }

    const numericId = Number(productMatch[1])
    const normalizedProductId = Number.isFinite(numericId)
      ? String(numericId)
      : productMatch[1]
    if (!normalizedProductId || normalizedProductId === '0') {
      warnings.push(`- ${entry.name}: ID produit invalide dans le nom`)
      continue
    }

    const fileBlob = await entry.async('blob')
    // Reconstruit un File utilisable par fetch/FormData.
    uploads.push({
      productId: normalizedProductId,
      fileName,
      file: new File([fileBlob], fileName, {
        type: fileBlob.type || guessMimeType(fileName),
      }),
    })
  }

  if (uploads.length === 0) {
    warnings.push('- Aucune image valide trouvee dans le dossier du ZIP')
  }

  return { uploads, warnings }
}
