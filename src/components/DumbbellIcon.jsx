export default function DumbbellIcon({ size = 26, color = 'currentColor', className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size} className={className}>
      <rect x="1"  y="7"  width="2" height="10" rx="1"/>
      <rect x="4"  y="5"  width="4" height="14" rx="1.5"/>
      <rect x="8"  y="10" width="8" height="4"  rx="1.5"/>
      <rect x="16" y="5"  width="4" height="14" rx="1.5"/>
      <rect x="21" y="7"  width="2" height="10" rx="1"/>
    </svg>
  )
}
