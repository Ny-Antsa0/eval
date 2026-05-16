type KpiCardProps = {
  label: string
  value: string
  icon?: string
  color?: 'teal' | 'amber' | 'blue' | 'rose'
}

const colorClassName = (color: KpiCardProps['color']) => {
  switch (color) {
    case 'amber':
      return 'kpi-card kpi-card--amber'
    case 'blue':
      return 'kpi-card kpi-card--blue'
    case 'rose':
      return 'kpi-card kpi-card--rose'
    default:
      return 'kpi-card kpi-card--teal'
  }
}

const KpiCard = ({ label, value, icon, color }: KpiCardProps) => {
  return (
    <div className={colorClassName(color)}>
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
      </div>
      {icon ? <span className="kpi-icon">{icon}</span> : null}
    </div>
  )
}

export default KpiCard
