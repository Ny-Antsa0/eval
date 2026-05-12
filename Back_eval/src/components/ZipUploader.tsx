type ZipUploaderProps = {
  isBusy: boolean
  log: string[]
  onUpload: (file: File) => void
}

const ZipUploader = ({ isBusy, log, onUpload }: ZipUploaderProps) => {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Upload d'images</h2>
          <p>Archive ZIP, association automatique par ID produit.</p>
        </div>
      </div>
      <label className="dropzone">
        <input
          type="file"
          accept=".zip"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              onUpload(file)
              event.target.value = ''
            }
          }}
          disabled={isBusy}
        />
        <div>
          <strong>Selectionnez une archive ZIP</strong>
          <span>Une image par produit, nommee par son ID (ex: 101.jpg).</span>
        </div>
        <span className="chip">ZIP unique</span>
      </label>
      <div className="log">
        {log.length === 0 ? (
          <p className="muted">Aucun upload pour le moment.</p>
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

export default ZipUploader
