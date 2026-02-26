
import '../styles/components/Skeleton.css'


export function SkeletonLine({ width = '100%', height = '1rem', style, className = '' }) {
  return (
    <div
      className={`skeleton skeleton-line ${className}`}
      style={{ width, height, ...style }}
    />
  )
}


export function SkeletonCircle({ size = '40px', style }) {
  return (
    <div
      className="skeleton skeleton-circle"
      style={{ width: size, height: size, ...style }}
    />
  )
}


export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <SkeletonLine width="40%" height="0.75rem" />
      <SkeletonLine width="60%" height="1.8rem" style={{ marginTop: '0.75rem' }} />
      <SkeletonLine width="80%" height="0.65rem" style={{ marginTop: '0.5rem' }} />
    </div>
  )
}


const COL_WIDTHS = [75, 60, 85, 70, 90, 65, 80, 55, 72, 68]


export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      {}
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={`h-${i}`} width={`${COL_WIDTHS[i % COL_WIDTHS.length]}%`} height="0.75rem" />
        ))}
      </div>
      {}
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton-table-row" key={`r-${r}`}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={`c-${r}-${c}`} width={`${COL_WIDTHS[(r + c) % COL_WIDTHS.length]}%`} height="0.75rem" />
          ))}
        </div>
      ))}
    </div>
  )
}


export function SkeletonText({ lines = 3 }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="0.75rem"
          style={{ marginBottom: '0.5rem' }}
        />
      ))}
    </div>
  )
}
