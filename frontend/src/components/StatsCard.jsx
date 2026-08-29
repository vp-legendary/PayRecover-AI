function StatsCard({ title, value, description }) {
  return (
    <div className="stats-card">
      <h3>{title}</h3>

      <p className="stats-value">
        {value}
      </p>

      <p className="stats-description">
        {description}
      </p>
    </div>
  )
}

export default StatsCard