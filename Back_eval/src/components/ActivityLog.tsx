type ActivityLogProps = {
  title: string
  lines: string[]
  emptyMessage: string
}

const ActivityLog = ({ title, lines, emptyMessage }: ActivityLogProps) => {
  return (
    <div className="activity-log" aria-live="polite">
      {/* aria-live pour annoncer les nouvelles entrees aux lecteurs d'ecran. */}
      <div className="activity-log__header">
        <h3>{title}</h3>
        <span>{lines.length} entree(s)</span>
      </div>
      {lines.length === 0 ? (
        // Etat vide clair pour eviter un bloc visuel vide.
        <p className="muted">{emptyMessage}</p>
      ) : (
        <ul>
          {/* Conserver l'ordre du log (prepend dans le hook). */}
          {lines.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ActivityLog
