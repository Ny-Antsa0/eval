import { useMemo } from 'react'

type CsvDropzoneProps = {
  isBusy: boolean
  log: string[]
  onImport: (files: FileList | File[]) => void
}

const CsvDropzone = ({ isBusy, log, onImport }: CsvDropzoneProps) => {
  const acceptLabel = useMemo(() => '.csv', [])

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Importation CSV</h2>
          <p>Selection multiple, conversion XML, synchronisation automatique.</p>
        </div>
      </div>
      <label className="dropzone">
        <input
          type="file"
          multiple
          accept={acceptLabel}
          onChange={(event) => {
            if (event.target.files) {
              onImport(event.target.files)
              event.target.value = ''
            }
          }}
          disabled={isBusy}
        />
        <div>
          <strong>Deposez vos CSV ici</strong>
          <span>ou cliquez pour selectionner plusieurs fichiers.</span>
        </div>
        <span className="chip">CSV multiples</span>
      </label>
      <div className="log">
        {log.length === 0 ? (
          <p className="muted">Aucun import pour le moment.</p>
        ) : (
          <ul>
            {log.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default CsvDropzone
