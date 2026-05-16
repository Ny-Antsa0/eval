import type { ReactNode } from 'react'

type UploadCardProps = {
  title: string
  description: string
  helperText: string
  buttonLabel: string
  badgeLabel: string
  accept: string
  multiple?: boolean
  disabled: boolean
  onSelectFiles: (files: FileList) => void
  children?: ReactNode
}

const UploadCard = ({
  title,
  description,
  helperText,
  buttonLabel,
  badgeLabel,
  accept,
  multiple = false,
  disabled,
  onSelectFiles,
  children,
}: UploadCardProps) => {
  return (
    <section className="card">
      {/* Entete reutilisable pour les cartes d'upload. */}
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="section-badge">{badgeLabel}</span>
      </div>

      {/* Input file masque pour un bouton stylise. */}
      <label className="file-picker">
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            // Ignore les selections vides (ex: annulation du dialog).
            if (!event.target.files || event.target.files.length === 0) {
              return
            }

            onSelectFiles(event.target.files)
            // Reset pour autoriser la reselection du meme fichier.
            event.target.value = ''
          }}
        />
        <span className="primary">{buttonLabel}</span>
        <span className="file-picker__helper">{helperText}</span>
      </label>

      {children}
    </section>
  )
}

export default UploadCard
