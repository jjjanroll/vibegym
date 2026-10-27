import { useState, useEffect } from 'react'
import { getAllWorkouts, getWorkoutExercises, getExercise } from '../db'

function formatDuracion(inicio, fin) {
  if (!inicio || !fin) return ''
  const mins = Math.round((new Date(fin) - new Date(inicio)) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatFecha(isoString) {
  const fecha = new Date(isoString)
  const hoy = new Date()
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  if (fecha.toDateString() === hoy.toDateString()) return 'Hoy'
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer'
  return fecha.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Entrenar({ onIniciar }) {
  const [recientes, setRecientes] = useState(null)

  useEffect(() => {
    async function cargar() {
      const todos = await getAllWorkouts()
      const completados = todos
        .filter(w => w.fechaFin)
        .sort((a, b) => new Date(b.fechaFin) - new Date(a.fechaFin))
        .slice(0, 3)

      const enriquecidos = await Promise.all(completados.map(async w => {
        const wes = await getWorkoutExercises(w.id)
        const nombres = await Promise.all(
          wes.slice(0, 3).map(we => getExercise(we.exerciseId).then(e => e?.nombre ?? ''))
        )
        return { ...w, ejercicios: nombres.filter(Boolean), total: wes.length }
      }))

      setRecientes(enriquecidos)
    }
    cargar()
  }, [])

  return (
    <div className="pb-8">

      <div className="px-4 pt-5 pb-2">
        <h1 className="text-[34px] font-bold tracking-tight">Entrenar</h1>
      </div>

      <div className="px-4 mt-4">
        <button
          onClick={onIniciar}
          className="w-full bg-[#30D158] text-black font-semibold text-lg py-4 rounded-2xl active:scale-[0.98] transition-transform"
        >
          Empezar entrenamiento
        </button>
      </div>

      {/* Mis rutinas */}
      <div className="px-4 mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[22px] font-bold">Mis rutinas</h2>
        </div>
        <div className="bg-[#1C1C1E] rounded-2xl px-5 py-6 text-center">
          <div className="w-12 h-12 bg-[#2C2C2E] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2"
                 strokeLinecap="round" width="22" height="22">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <p className="text-white font-medium">Sin rutinas aún</p>
          <p className="text-[#8E8E93] text-sm mt-1">Crea una para arrancar más rápido</p>
          <button className="mt-4 text-[#30D158] font-semibold text-base">
            + Nueva rutina
          </button>
        </div>
      </div>

      {/* Recientes */}
      <div className="px-4 mt-6">
        <h2 className="text-[22px] font-bold mb-3">Recientes</h2>
        {recientes === null ? (
          <div className="bg-[#1C1C1E] rounded-2xl px-5 py-6 text-center">
            <p className="text-[#8E8E93]">Cargando...</p>
          </div>
        ) : recientes.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl px-5 py-6 text-center">
            <p className="text-[#8E8E93]">Tus entrenamientos aparecerán aquí</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recientes.map(w => (
              <div key={w.id} className="bg-[#1C1C1E] rounded-2xl px-5 py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">
                      {w.nombre || 'Entrenamiento'}
                    </p>
                    <p className="text-[#8E8E93] text-sm">{formatFecha(w.fechaFin)}</p>
                  </div>
                  <span className="text-[#30D158] text-sm font-medium shrink-0">
                    {formatDuracion(w.fechaInicio, w.fechaFin)}
                  </span>
                </div>
                {w.ejercicios.length > 0 && (
                  <p className="text-[#8E8E93] text-sm">
                    {w.ejercicios.join(' · ')}
                    {w.total > 3 ? ` +${w.total - 3} más` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
