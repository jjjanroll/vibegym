import { useState, useEffect } from 'react'
import { getWorkoutExercises, getSets, getExercise, getPRForExercise } from '../db'

function formatDuracion(inicio, fin) {
  const s = Math.floor((new Date(fin) - new Date(inicio)) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min`
  return '<1min'
}

function formatVolumen(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}

// Fórmula Epley: 1RM estimado
function epley(peso, reps) {
  if (!peso || !reps) return 0
  return peso * (1 + reps / 30)
}

export default function ResumenWorkout({ workout, onGuardar }) {
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    async function cargar() {
      const wes = await getWorkoutExercises(workout.id)
      const ejercicios = []
      let volumenTotal = 0
      let seriesTotal = 0
      const prsNuevos = []

      for (const we of wes) {
        const ej = await getExercise(we.exerciseId)
        const sets = (await getSets(we.id))
          .filter(s => s.completada)
          .sort((a, b) => a.orden - b.orden)

        if (sets.length === 0) continue

        const volumenEj = sets.reduce((sum, s) => sum + (s.peso || 0) * (s.reps || 0), 0)
        volumenTotal += volumenEj
        seriesTotal += sets.length

        // PR: ¿hay algún set que sea el mejor 1RM de este ejercicio?
        const prActual = await getPRForExercise(we.exerciseId)
        let esPR = false
        let mejorSet = null

        for (const s of sets) {
          const rm = epley(s.peso, s.reps)
          if (prActual && rm >= prActual.rm1 * 0.999) {
            // Es igual o supera el PR histórico (0.1% de margen por flotantes)
            if (!mejorSet || rm > epley(mejorSet.peso, mejorSet.reps)) {
              mejorSet = s
              esPR = true
            }
          }
        }

        ejercicios.push({ nombre: ej?.nombre ?? 'Ejercicio', sets, volumenEj, esPR, mejorSet })
        if (esPR && mejorSet) {
          prsNuevos.push({ nombre: ej?.nombre, peso: mejorSet.peso, reps: mejorSet.reps })
        }
      }

      setDatos({ ejercicios, volumenTotal, seriesTotal, prsNuevos })
    }
    cargar()
  }, [workout.id])

  const duracion = formatDuracion(workout.fechaInicio, workout.fechaFin)

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>

      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-[#38383A]">
        <h1 className="text-2xl font-bold text-white">¡Listo! 💪</h1>
        <p className="text-[#8E8E93] text-sm mt-0.5">
          {workout.nombre || 'Entrenamiento terminado'}
        </p>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* Stats */}
        <div className="px-4 mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Duración', value: duracion },
            { label: 'Volumen',  value: datos ? (datos.volumenTotal > 0 ? formatVolumen(datos.volumenTotal) : '—') : '…' },
            { label: 'Series',   value: datos ? String(datos.seriesTotal) : '…' },
          ].map(s => (
            <div key={s.label} className="bg-[#1C1C1E] rounded-2xl p-3 text-center">
              <p className="text-white font-bold text-xl">{s.value}</p>
              <p className="text-[#8E8E93] text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* PRs nuevos */}
        {datos?.prsNuevos.length > 0 && (
          <div className="mx-4 mt-4 bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#38383A]">
              <p className="text-white font-semibold">🏆 Récords personales</p>
            </div>
            {datos.prsNuevos.map((pr, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-t border-[#38383A] first:border-t-0 bg-[#30D158]/10">
                <p className="text-[#30D158] font-medium text-sm">{pr.nombre}</p>
                <p className="text-[#30D158] text-sm font-bold">{pr.peso}kg × {pr.reps}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lista de ejercicios */}
        {datos && datos.ejercicios.length > 0 && (
          <div className="mx-4 mt-4 bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#38383A]">
              <p className="text-white font-semibold">Ejercicios</p>
            </div>
            {datos.ejercicios.map((ej, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-t border-[#38383A]">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {ej.esPR && '🏆 '}{ej.nombre}
                  </p>
                  <p className="text-[#8E8E93] text-xs mt-0.5">
                    {ej.sets.length} serie{ej.sets.length !== 1 ? 's' : ''}
                    {ej.volumenEj > 0 ? ` · ${formatVolumen(ej.volumenEj)}` : ''}
                  </p>
                </div>
                <p className="text-[#8E8E93] text-xs ml-3 shrink-0">
                  {ej.sets.map(s => `${s.peso ?? '—'}×${s.reps ?? '—'}`).join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}

        {!datos && (
          <div className="px-4 mt-10 text-center text-[#8E8E93]">Calculando...</div>
        )}
      </div>

      {/* Guardar como plantilla */}
      {datos && datos.ejercicios.length > 0 && (
        <GuardarPlantillaInline onGuardar={onGuardar} />
      )}

      {/* Botón guardar simple si no hay datos */}
      {(!datos || datos.ejercicios.length === 0) && (
        <div className="shrink-0 px-4 py-4 bg-black border-t border-[#38383A]"
             style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <button
            onClick={() => onGuardar(null)}
            className="w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80"
          >
            Guardar entrenamiento
          </button>
        </div>
      )}
    </div>
  )
}

function GuardarPlantillaInline({ onGuardar }) {
  const [modo, setModo] = useState('normal') // 'normal' | 'nombrePlantilla'
  const [nombre, setNombre] = useState('')

  if (modo === 'nombrePlantilla') {
    return (
      <div className="shrink-0 px-4 py-4 bg-black border-t border-[#38383A]"
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Nombre de la rutina (ej: Empuje A)"
          autoFocus
          className="w-full bg-[#1C1C1E] text-white px-4 py-3.5 rounded-xl outline-none placeholder-[#3A3A3C] mb-3"
        />
        <div className="flex gap-3">
          <button
            onClick={() => setModo('normal')}
            className="flex-1 bg-[#2C2C2E] text-white font-semibold py-4 rounded-2xl active:opacity-80"
          >
            Cancelar
          </button>
          <button
            onClick={() => onGuardar(nombre.trim() || 'Mi rutina')}
            className="flex-1 bg-[#30D158] text-black font-bold py-4 rounded-2xl active:opacity-80"
          >
            Guardar rutina
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="shrink-0 px-4 py-4 bg-black border-t border-[#38383A]"
         style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
      <button
        onClick={() => onGuardar(null)}
        className="w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80 mb-3"
      >
        Guardar entrenamiento
      </button>
      <button
        onClick={() => setModo('nombrePlantilla')}
        className="w-full text-[#30D158] font-semibold text-base py-2 active:opacity-70"
      >
        + Guardar también como rutina
      </button>
    </div>
  )
}
