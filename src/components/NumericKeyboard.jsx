export default function NumericKeyboard({ campoActivo, items, onDigit, onDecimal, onBackspace, onIncrement, onNext, onDismiss, unidad = 'kg' }) {
  if (!campoActivo) return null

  const { campo } = campoActivo
  const esPeso = campo === 'peso' || campo === 'tiempo'
  const step = campo === 'peso' ? (unidad === 'lb' ? 5 : 2.5) : campo === 'distancia' ? 0.5 : 1

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 bg-[#1C1C1E] border-t border-[#38383A]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      onTouchEnd={e => e.stopPropagation()}
    >
      <div className="grid grid-cols-4" style={{ gap: '1px', backgroundColor: '#38383A' }}>
        <Key label="1" onPress={() => onDigit('1')} />
        <Key label="2" onPress={() => onDigit('2')} />
        <Key label="3" onPress={() => onDigit('3')} />
        <Key label="Next ›" onPress={onNext} />

        <Key label="4" onPress={() => onDigit('4')} />
        <Key label="5" onPress={() => onDigit('5')} />
        <Key label="6" onPress={() => onDigit('6')} />
        <Key label={`−${step}`} onPress={() => onIncrement(-step)} accent />

        <Key label="7" onPress={() => onDigit('7')} />
        <Key label="8" onPress={() => onDigit('8')} />
        <Key label="9" onPress={() => onDigit('9')} />
        <Key label={`+${step}`} onPress={() => onIncrement(step)} accent />

        <Key label={esPeso ? '.' : ''} onPress={esPeso ? onDecimal : undefined} muted={!esPeso} />
        <Key label="0" onPress={() => onDigit('0')} />
        <Key label="⌫" onPress={onBackspace} />
        <Key label="✓" onPress={onDismiss} primary />
      </div>
    </div>
  )
}

function Key({ label, onPress, primary, accent, muted }) {
  if (!label && !onPress) return <div className="bg-[#1C1C1E] h-14" />
  return (
    <button
      onTouchEnd={e => { e.preventDefault(); onPress?.() }}
      onClick={onPress}
      disabled={!onPress}
      className={`h-14 flex items-center justify-center text-lg font-semibold select-none active:opacity-50 disabled:opacity-0 ${
        primary ? 'bg-[#30D158] text-black text-base font-bold'
        : accent  ? 'bg-[#2C2C2E] text-[#30D158]'
        : muted   ? 'bg-[#1C1C1E] text-[#636366]'
        :           'bg-[#2C2C2E] text-white'
      }`}
    >
      {label}
    </button>
  )
}
