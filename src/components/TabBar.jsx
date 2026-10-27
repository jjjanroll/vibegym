import DumbbellIcon from './DumbbellIcon'

const tabs = [
  {
    id: 'entrenar',
    label: 'Entrenar',
    icon: <DumbbellIcon size={26} />,
  },
  {
    id: 'historial',
    label: 'Historial',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 7 12 12 15 15"/>
      </svg>
    ),
  },
  {
    id: 'ejercicios',
    label: 'Ejercicios',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26">
        <line x1="9" y1="6"  x2="20" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="9" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="9" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="5" cy="6"  r="1.5" fill="currentColor"/>
        <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="5" cy="18" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'yo',
    label: 'Yo',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26">
        <circle cx="12" cy="8" r="4" fill="currentColor"/>
        <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
]

export default function TabBar({ active, onChange }) {
  return (
    <div
      className="bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-[#38383A]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
              active === t.id ? 'text-[#30D158]' : 'text-[#8E8E93]'
            }`}
          >
            {t.icon}
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
