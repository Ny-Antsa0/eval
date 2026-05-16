import CsvDropzone from '../components/CsvDropzone'
import ResetPanel from '../components/ResetPanel'
import ZipUploader from '../components/ZipUploader'
import type { BusyState, LogState, ResetGroup } from '../hooks/backOffice/types'

type ControlCenterProps = {
  groups: ResetGroup[]
  busy: BusyState
  logs: LogState
  onResetGroup: (group: ResetGroup) => void
  onImportCsv: (files: FileList | File[]) => void
  onUploadZip: (files: FileList | File[]) => void
}

const ControlCenter = ({
  groups,
  busy,
  logs,
  onResetGroup,
  onImportCsv,
  onUploadZip,
}: ControlCenterProps) => {
  return (
    <>
      {/* Intro et contexte de la page control. */}
      <section className="page-intro">
        <div>
          <span className="kicker">Page 1</span>
          <h1>Controle centralise</h1>
        </div>
        <p>
          Nettoyage, import massif Excel/CSV et chargement d&apos;images ZIP
          depuis une seule interface securisee.
        </p>
      </section>

      {/* Les trois briques principales du back-office. */}
      <section className="grid">
        <ResetPanel
          groups={groups}
          isBusy={busy.reset}
          log={logs.reset}
          onReset={onResetGroup}
        />
        <CsvDropzone
          isBusy={busy.csv}
          log={logs.csv}
          onImport={onImportCsv}
        />
        <ZipUploader
          isBusy={busy.zip}
          log={logs.zip}
          onUpload={onUploadZip}
        />
      </section>
    </>
  )
}

export default ControlCenter
