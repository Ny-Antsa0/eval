import ActivityLog from './ActivityLog'
import UploadCard from './UploadCard'

type ZipUploaderProps = {
  isBusy: boolean
  log: string[]
  onUpload: (files: FileList | File[]) => void
}

const ZipUploader = ({ isBusy, log, onUpload }: ZipUploaderProps) => {
  // Carte de chargement d'archives ZIP d'images.
  return (
    <UploadCard
      title="Upload d'images ZIP"
      description="Extraction du dossier d'images contenu dans le ZIP."
      helperText="Le ZIP doit contenir un dossier d'images; chaque image commence par l'ID produit, par exemple 101.jpg."
      buttonLabel="Parcourir le ZIP"
      badgeLabel="ZIP unique"
      accept=".zip,application/zip"
      disabled={isBusy}
      onSelectFiles={onUpload}
    >
      <ActivityLog
        title="Rapport d'upload images"
        lines={log}
        emptyMessage="Aucun upload pour le moment."
      />
    </UploadCard>
  )
}

export default ZipUploader
