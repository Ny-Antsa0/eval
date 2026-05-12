import type { ResetGroup } from '../pages/Dashboard'

type ResetPanelProps = {
  groups: ResetGroup[]
  isBusy: boolean
  log: string[]
  onReset: (group: ResetGroup) => void
}

const ResetPanel = ({ groups, isBusy, log, onReset }: ResetPanelProps) => {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Reinitialisation des donnees</h2>
          <p>Purge par groupe, dans l'ordre securise des dependances.</p>
        </div>
      </div>
      <div className="group-actions">
        {groups.map((group) => (
          <button
            key={group.label}
            type="button"
            className="secondary"
            onClick={() => onReset(group)}
            disabled={isBusy}
          >
            Reinitialiser {group.label}
          </button>
        ))}
      </div>
      <div className="log">
        {log.length === 0 ? (
          <p className="muted">Aucun rapport pour le moment.</p>
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

export default ResetPanel
