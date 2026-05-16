import ActivityLog from './ActivityLog'
import UploadCard from './UploadCard'
import { CSV_TEMPLATE_HINTS } from '../hooks/backOffice/constants'

type CsvDropzoneProps = {
  isBusy: boolean
  log: string[]
  onImport: (files: FileList | File[]) => void
}

const CsvDropzone = ({ isBusy, log, onImport }: CsvDropzoneProps) => {
  // Carte generique qui encapsule le file input et le contenu.
  return (
    <UploadCard
      title="Importation Excel / CSV"
      description="Selection multiple de fichiers tableur et synchronisation API."
      helperText="Format principal: fichier Excel avec feuilles produits, declinaisons/stock et commandes. CSV/TSV restent acceptes."
      buttonLabel="Parcourir les fichiers"
      badgeLabel="Excel et CSV"
      accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xltx,.xltm,.xls,.xlsb,.xla,.xlt,.xml,.html,.htm,text/csv,text/tab-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      multiple
      disabled={isBusy}
      onSelectFiles={onImport}
    >
      <div className="template-list">
        <h3>Exemples de structures attendues</h3>
        <ul>
          {/* Aide visuelle pour limiter les erreurs de mapping. */}
          {CSV_TEMPLATE_HINTS.map((template) => (
            <li key={template.fileName}>
              <strong>{template.fileName}</strong>
              <span>{template.columns.join(', ')}</span>
            </li>
          ))}
        </ul>
      </div>

      <ActivityLog
        title="Rapport d'import"
        lines={log}
        emptyMessage="Aucun import pour le moment."
      />
    </UploadCard>
  )
}

export default CsvDropzone
