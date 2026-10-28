import { useRef, useEffect } from 'react'

const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Día de la semana lunes=0 … domingo=6
function diaSemana(date) {
  return (date.getDay() + 6) % 7
}

function generarMes(year, month) {
  const primer = new Date(year, month, 1)
  const ultimo = new Date(year, month + 1, 0)
  const offsetInicio = diaSemana(primer)

  const celdas = []

  // Días del mes anterior para completar la primera fila
  for (let i = offsetInicio - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    celdas.push({ fecha: toYMD(d), numero: d.getDate(), otroMes: true })
  }

  // Días del mes
  for (let d = 1; d <= ultimo.getDate(); d++) {
    const fecha = new Date(year, month, d)
    celdas.push({ fecha: toYMD(fecha), numero: d, otroMes: false })
  }

  // Días del mes siguiente para completar la última fila
  const restante = (7 - (celdas.length % 7)) % 7
  for (let d = 1; d <= restante; d++) {
    const fecha = new Date(year, month + 1, d)
    celdas.push({ fecha: toYMD(fecha), numero: d, otroMes: true })
  }

  return celdas
}

function MesCalendario({ year, month, workoutDias, hoy }) {
  const celdas = generarMes(year, month)
  const semanas = []
  for (let i = 0; i < celdas.length; i += 7) {
    semanas.push(celdas.slice(i, i + 7))
  }

  return (
    <div className="min-w-full px-4 pb-2">
      <p className="text-white font-semibold text-base text-center mb-3">
        {MESES[month]} {year}
      </p>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-[#8E8E93] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Semanas */}
      {semanas.map((semana, si) => (
        <div key={si} className="grid grid-cols-7">
          {semana.map((celda) => {
            const tieneWorkout = !celda.otroMes && workoutDias.has(celda.fecha)
            const esHoy = celda.fecha === hoy && !celda.otroMes

            return (
              <div key={celda.fecha} className="flex items-center justify-center py-[3px]">
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[13px] font-medium"
                  style={{
                    backgroundColor: tieneWorkout ? '#30D158' : 'transparent',
                    color: celda.otroMes
                      ? '#3A3A3C'
                      : tieneWorkout
                        ? '#000'
                        : esHoy
                          ? '#fff'
                          : '#AEAEB2',
                    border: esHoy && !tieneWorkout ? '1.5px solid #30D158' : 'none',
                  }}
                >
                  {celda.numero}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function CalendarioAsistencia({ workoutDias }) {
  const scrollRef = useRef(null)
  const hoy = toYMD(new Date())

  const meses = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    meses.push({ year: d.getFullYear(), month: d.getMonth() })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Scroll al último mes (el actual, índice 5)
    el.scrollLeft = el.scrollWidth
  }, [])

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-scroll"
      style={{
        scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {meses.map(({ year, month }) => (
        <div
          key={`${year}-${month}`}
          style={{ scrollSnapAlign: 'start', minWidth: '100%' }}
        >
          <MesCalendario
            year={year}
            month={month}
            workoutDias={workoutDias}
            hoy={hoy}
          />
        </div>
      ))}
    </div>
  )
}
