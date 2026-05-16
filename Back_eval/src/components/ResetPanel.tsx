import ActivityLog from './ActivityLog'
import type { ResetGroup } from '../hooks/backOffice/types'

type ResetPanelProps = {
  groups: ResetGroup[]
  isBusy: boolean
  log: string[]
  onReset: (group: ResetGroup) => void
}

const ResetPanel = ({ groups, isBusy, log, onReset }: ResetPanelProps) => {
  return (
    <section className="card">
      {/* Resume du role du cleaner et des contraintes FK. */}
      <div className="card-header">
        <div>
          <h2>Reinitialisation des donnees</h2>
          <p>Purge par groupe, dans l&apos;ordre securise des dependances.</p>
        </div>
        <span className="section-badge">Cleaner</span>
      </div>

      <div className="group-actions">
        {/* Un bouton par groupe pour respecter l'ordre de suppression. */}
        {groups.map((group) => (
          <div key={group.id} className="action-tile">
            <div>
              <strong>{group.label}</strong>
              <p>{group.description}</p>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => onReset(group)}
              disabled={isBusy}
            >
              Reinitialiser
            </button>
          </div>
        ))}
      </div>

      <ActivityLog
        title="Rapport de nettoyage"
        lines={log}
        emptyMessage="Aucun rapport pour le moment."
      />
    </section>
  )
}

export default ResetPanel
