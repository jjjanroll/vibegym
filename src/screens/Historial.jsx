import { useState, useEffect } from 'react'
import { getAllWorkouts, getWorkoutExercises, getSets, getExercise } from '../db'
import CalendarioAsistencia from '../components/CalendarioAsistencia'

// ── Helpers ───────────────────────────────────────────────────────────────

function formatFecha(isoStr) {
  const fecha = new Date(isoStr)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (fecha.toDateString() === hoy.toDateString()) return 'Hoy'
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer'
  return fecha.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatHora(isoStr) {
  return new Date(isoStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function formatDuracion(inicio, fin) {
  if (!fin) return null
  const s = Math.floor((new Date(fin) - new Date(inicio)) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min`
  return '<1min'
}

function formatVolumen(kg) {
  if (!kg || kg === 0) return null
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}

function formatNumero(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function nombreDefault(isoStr) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return `Entrenamiento del ${dias[new Date(isoStr).getDay()]}`
}

// ── Detalle de un entrenamiento ───────────────────────────────────────────

function DetalleWorkout({ workout, onVolver }) {
  const [ejercicios, setEjercicios] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const wes = await getWorkoutExercises(workout.id)
      const items = []
      for (const we of wes) {
        const ejercicio = await getExercise(we.exerciseId)
        const sets = (await getSets(we.id)).sort((a, b) => a.orden - b.orden)
        items.push({ nombre: ejercicio?.nombre ?? 'Ejercicio', notas: we.notas, sets })
      }
      setEjercicios(items)
      setCargando(false)
    }
    cargar()
  }, [workout.id])

  const nombre = workout.nombre || nombreDefault(workout.fechaInicio)
  const duracion = formatDuracion(workout.fechaInicio, workout.fechaFin)
  const volumenTotal = ejercicios.reduce((sum, e) =>
    sum + e.sets.filter(s => s.completada).reduce((s2, s) => s2 + (s.peso || 0) * (s.reps || 0), 0), 0)
  const seriesTotal = ejercicios.reduce((n, e) => n + e.sets.filter(s => s.completada).length, 0)

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <button onClick={onVolver} className="text-[#30D158] font-medium text-sm mb-3 flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="16" height="16">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Historial
        </button>
        <h1 className="text-2xl font-bold text-white">{nombre}</h1>
        <p className="text-[#8E8E93] text-sm mt-1">
          {formatFecha(workout.fechaInicio)} · {formatHora(workout.fechaInicio)}
        </p>
      </div>

      {/* Stats rápidos */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Duración',  value: duracion || '—' },
          { label: 'Volumen',   value: volumenTotal > 0 ? formatVolumen(volumenTotal) : '—' },
          { label: 'Series',    value: seriesTotal > 0 ? String(seriesTotal) : '—' },
        ].map(s => (
          <div key={s.label} className="bg-[#1C1C1E] rounded-2xl p-3 text-center">
            <p className="text-white font-bold text-lg">{s.value}</p>
            <p className="text-[#8E8E93] text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ejercicios */}
      {cargando ? (
        <div className="mx-4 bg-[#1C1C1E] rounded-2xl p-8 text-center text-[#8E8E93]">
          Cargando...
        </div>
      ) : ejercicios.length === 0 ? (
        <div className="mx-4 bg-[#1C1C1E] rounded-2xl p-8 text-center text-[#8E8E93]">
          Sin ejercicios registrados
        </div>
      ) : (
        ejercicios.map((item, i) => (
          <div key={i} className="mx-4 mt-3 bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-[#38383A]">
              <p className="text-[#30D158] font-semibold">{item.nombre}</p>
              {item.notas ? (
                <p className="text-[#8E8E93] text-xs mt-0.5 italic">"{item.notas}"</p>
              ) : null}
            </div>
            <div className="flex items-center px-4 pt-2 pb-1 gap-3 text-[#8E8E93] text-xs font-medium">
              <span className="w-5 text-center">#</span>
              <span className="flex-1 text-center">kg</span>
              <span className="flex-1 text-center">Reps</span>
              <span className="w-5" />
            </div>
            {item.sets.map((set, sIdx) => (
              <div
                key={set.id}
                className={`flex items-center px-4 py-2 gap-3 border-t border-[#38383A] ${
                  set.completada ? 'bg-[#30D158]/10' : 'opacity-35'
                }`}
              >
                <span className="w-5 text-center text-[#8E8E93] text-sm">{sIdx + 1}</span>
                <span className={`flex-1 text-center text-sm font-medium ${set.completada ? 'text-white' : 'text-[#8E8E93]'}`}>
                  {set.peso ?? '—'}
                </span>
                <span className={`flex-1 text-center text-sm font-medium ${set.completada ? 'text-white' : 'text-[#8E8E93]'}`}>
                  {set.reps ?? '—'}
                </span>
                <div className="w-5 flex justify-center">
                  {set.completada && (
                    <div className="w-4 h-4 rounded-full bg-[#30D158] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="#000"
                           strokeLinecap="round" strokeLinejoin="round" width="9" height="9">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

// ── Pantalla principal de Historial ───────────────────────────────────────

export default function Historial() {
  const [workouts, setWorkouts] = useState([])
  const [stats, setStats] = useState({ entrenos: 0, series: 0, volumen: 0 })
  const [workoutDias, setWorkoutDias] = useState(new Set())
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarHistorial() }, [])

  async function cargarHistorial() {
    setCargando(true)
    const todos = await getAllWorkouts()
    const completados = todos.filter(w => w.fechaFin)

    let totalSeries = 0
    let totalVolumen = 0
    const enriquecidos = []

    for (const w of completados) {
      const wes = await getWorkoutExercises(w.id)
      const nombres = []
      let volumen = 0
      let series = 0

      for (const we of wes) {
        const ej = await getExercise(we.exerciseId)
        if (ej) nombres.push(ej.nombre)
        const sets = await getSets(we.id)
        const ok = sets.filter(s => s.completada)
        series += ok.length
        volumen += ok.reduce((sum, s) => sum + (s.peso || 0) * (s.reps || 0), 0)
      }

      totalSeries += series
      totalVolumen += volumen
      enriquecidos.push({ ...w, ejercicios: nombres, volumen, series })
    }

    const dias = new Set(
      completados
        .filter(w => w.fechaFin)
        .map(w => w.fechaFin.slice(0, 10))
    )
    setWorkoutDias(dias)
    setWorkouts(enriquecidos)
    setStats({ entrenos: completados.length, series: totalSeries, volumen: totalVolumen })
    setCargando(false)
  }

  if (detalle) {
    return <DetalleWorkout workout={detalle} onVolver={() => setDetalle(null)} />
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-[34px] font-bold tracking-tight">Historial</h1>
      </div>

      {/* Stats globales */}
      <p className="px-4 pt-4 pb-2 text-[#8E8E93] text-xs uppercase tracking-widest">Totales</p>
      <div className="px-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Entrenos', value: formatNumero(stats.entrenos) },
          { label: 'Series',   value: formatNumero(stats.series) },
          { label: 'Volumen',  value: stats.volumen > 0 ? formatVolumen(stats.volumen) : '0kg' },
        ].map(s => (
          <div key={s.label} className="bg-[#1C1C1E] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-[#8E8E93] text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Calendario de asistencia */}
      <p className="px-4 pt-5 pb-2 text-[#8E8E93] text-xs uppercase tracking-widest">Asistencia</p>
      <div className="mb-2">
        <CalendarioAsistencia workoutDias={workoutDias} />
      </div>

      {/* Lista de entrenamientos */}
      <div className="px-4 mt-5">
        <h2 className="text-[22px] font-bold mb-3">Entrenamientos</h2>

        {cargando ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-10 text-center text-[#8E8E93]">
            Cargando...
          </div>
        ) : workouts.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl px-5 py-10 text-center">
            <p className="text-[#8E8E93] text-base">Completa tu primer entreno</p>
            <p className="text-[#8E8E93] text-sm mt-1">y aparecerá aquí</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {workouts.map(w => {
              const nombre = w.nombre || nombreDefault(w.fechaInicio)
              const duracion = formatDuracion(w.fechaInicio, w.fechaFin)
              const ejerciciosStr = w.ejercicios.length === 0
                ? 'Sin ejercicios'
                : w.ejercicios.slice(0, 2).join(', ') + (w.ejercicios.length > 2 ? ` +${w.ejercicios.length - 2} más` : '')

              return (
                <button
                  key={w.id}
                  onClick={() => setDetalle(w)}
                  className="bg-[#1C1C1E] rounded-2xl p-4 text-left active:opacity-70 w-full"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-base leading-tight truncate">{nombre}</p>
                      <p className="text-[#8E8E93] text-xs mt-0.5">
                        {formatFecha(w.fechaInicio)} · {formatHora(w.fechaInicio)}
                      </p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#38383A" strokeWidth="2.5"
                         strokeLinecap="round" width="16" height="16" className="shrink-0 mt-0.5">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>

                  <p className="text-[#8E8E93] text-sm mt-2 truncate">{ejerciciosStr}</p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {duracion && (
                      <span className="text-[#8E8E93] text-xs bg-[#2C2C2E] px-2 py-0.5 rounded-md">
                        ⏱ {duracion}
                      </span>
                    )}
                    {w.volumen > 0 && (
                      <span className="text-[#8E8E93] text-xs bg-[#2C2C2E] px-2 py-0.5 rounded-md">
                        {formatVolumen(w.volumen)}
                      </span>
                    )}
                    {w.series > 0 && (
                      <span className="text-[#8E8E93] text-xs bg-[#2C2C2E] px-2 py-0.5 rounded-md">
                        {w.series} series
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
