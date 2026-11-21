// The loading circle: 12 dots, each a little smaller than the one before,
// turning nonstop. No visible text; screen readers hear "Loading".
export function Spinner() {
  return (
    <div className="spinner" role="status">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <circle
              key={i}
              cx={20 + Math.sin(a) * 14}
              cy={20 - Math.cos(a) * 14}
              r={3.2 - i * 0.2}
              opacity={1 - i * 0.06}
            />
          )
        })}
      </svg>
      <span className="visually-hidden">Loading</span>
    </div>
  )
}
