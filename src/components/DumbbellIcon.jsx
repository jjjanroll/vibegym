export default function DumbbellIcon({ size = 26, color = 'currentColor', className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size} className={className}>
      {/* End caps */}
      <rect x="1"   y="9.5" width="2"   height="5"  rx="1"/>
      <rect x="21"  y="9.5" width="2"   height="5"  rx="1"/>
      {/* Outer plates */}
      <rect x="3"   y="7.5" width="3.5" height="9"  rx="1.5"/>
      <rect x="17.5" y="7.5" width="3.5" height="9"  rx="1.5"/>
      {/* Inner plates */}
      <rect x="6.5" y="8.5" width="3"   height="7"  rx="1.2"/>
      <rect x="14.5" y="8.5" width="3"   height="7"  rx="1.2"/>
      {/* Bar */}
      <rect x="9.5" y="10.5" width="5"   height="3"  rx="1.2"/>
    </svg>
  )
}
