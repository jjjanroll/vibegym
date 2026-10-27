import { useState, useEffect } from 'react'
import { getAllWorkouts, getWorkoutExercises, getExercise, getAllTemplates, getTemplateExercises, saveTemplate, saveTemplateExercise, deleteTemplate } from '../db'
import SelectorEjercicios from './SelectorEjercicios'

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

// ── Crear plantilla desde cero ────────────────────────────────────────────

function CrearPlantilla({ onGuardar, onCancelar }) {
  const [paso, setPaso] = useState('nombre') // 'nombre' | 'ejercicios'
  const [nombre, setNombre] = useState('')
  const [ejercicios, setEjercicios] = useState([]) // [{ id, nombre, tipo }]
  const [seleccionando, setSeleccionando] = useState(false)

  async function guardar() {
    if (!nombre.trim() || ejercicios.length === 0) return
    const tId = await saveTemplate({ nombre: nombre.trim(), creadoEn: new Date().toISOString() })
    for (let i = 0; i < ejercicios.length; i++) {
      await saveTemplateExercise({ templateId: tId, exerciseId: ejercicios[i].id, orden: i + 1, seriesDefault: 3 })
    }
    onGuardar()
  }

  if (seleccionando) {
    return (
      <SelectorEjercicios
        onSeleccionar={ej => {
          setEjercicios(prev => prev.find(e => e.id === ej.id) ? prev : [...prev, ej])
          setSeleccionando(false)
        }}
        onCancelar={() => setSeleccionando(false)}
      />
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="shrink-0 px-4 pt-5 pb-3 flex items-center gap-3 border-b border-[#38383A]">
        <button onClick={onCancelar} className="text-[#30D158] font-medium text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="16" height="16"><path d="M15 18l-6-6 6-6"/></svg>
          Cancelar
        </button>
        <h1 className="text-lg font-bold flex-1">Nueva rutina</h1>
        <button
          onClick={guardar}
          disabled={!nombre.trim() || ejercicios.length === 0}
          className="text-[#30D158] font-semibold disabled:opacity-30"
        >
          Guardar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Nombre */}
        <div className="px-4 mt-4">
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre de la rutina"
            autoFocus
            className="w-full bg-[#1C1C1E] text-white text-xl font-semibold px-5 py-4 rounded-2xl outline-none placeholder-[#3A3A3C]"
          />
        </div>

        {/* Ejercicios */}
        <div className="px-4 mt-5">
          <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Ejercicios</p>
          {ejercicios.length > 0 && (
            <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A] mb-3">
              {ejercicios.map((ej, i) => (
                <div key={ej.id} className="flex items-center px-4 py-3.5 gap-3">
                  <span className="text-[#8E8E93] text-sm w-5 shrink-0">{i + 1}</span>
                  <span className="text-white flex-1">{ej.nombre}</span>
                  <button
                    onClick={() => setEjercicios(prev => prev.filter(e => e.id !== ej.id))}
                    className="text-[#FF3B30] text-sm active:opacity-70"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setSeleccionando(true)}
            className="w-full bg-[#1C1C1E] py-4 rounded-2xl text-[#30D158] font-semibold active:opacity-70"
          >
            + Agregar ejercicio
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pantalla principal Entrenar ───────────────────────────────────────────

export default function Entrenar({ onIniciar }) {
  const [recientes, setRecientes] = useState(null)
  const [plantillas, setPlantillas] = useState(null)
  const [creando, setCreando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null) // id de plantilla

  useEffect(() => {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const [todos, templates] = await Promise.all([getAllWorkouts(), getAllTemplates()])

    // Recientes
    const completados = todos.filter(w => w.fechaFin)
      .sort((a, b) => new Date(b.fechaFin) - new Date(a.fechaFin))
      .slice(0, 3)

    const enriquecidos = await Promise.all(completados.map(async w => {
      const wes = await getWorkoutExercises(w.id)
      const nombres = await Promise.all(wes.slice(0, 3).map(we => getExercise(we.exerciseId).then(e => e?.nombre ?? '')))
      return { ...w, ejercicios: nombres.filter(Boolean), total: wes.length }
    }))
    setRecientes(enriquecidos)

    // Plantillas
    const enriquecidas = await Promise.all(templates.map(async t => {
      const tes = await getTemplateExercises(t.id)
      const nombres = await Promise.all(tes.slice(0, 3).map(te => getExercise(te.exerciseId).then(e => e?.nombre ?? '')))
      return { ...t, ejercicios: nombres.filter(Boolean), total: tes.length }
    }))
    setPlantillas(enriquecidas)
  }

  async function handleEliminarPlantilla(id) {
    await deleteTemplate(id)
    setConfirmarEliminar(null)
    cargarTodo()
  }

  if (creando) {
    return (
      <CrearPlantilla
        onGuardar={() => { setCreando(false); cargarTodo() }}
        onCancelar={() => setCreando(false)}
      />
    )
  }

  return (
    <div className="pb-8">

      <div className="px-4 pt-5 pb-2">
        <h1 className="text-[34px] font-bold tracking-tight">Entrenar</h1>
      </div>

      {/* Botón principal */}
      <div className="px-4 mt-4">
        <button
          onClick={() => onIniciar()}
          className="w-full bg-[#30D158] text-black font-semibold text-lg py-4 rounded-2xl active:scale-[0.98] transition-transform"
        >
          Empezar entrenamiento
        </button>
      </div>

      {/* Mis rutinas */}
      <div className="px-4 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[22px] font-bold">Mis rutinas</h2>
          <button onClick={() => setCreando(true)} className="text-[#30D158] font-semibold text-sm">
            + Nueva
          </button>
        </div>

        {plantillas === null ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-5 text-center text-[#8E8E93] text-sm">Cargando...</div>
        ) : plantillas.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl px-5 py-6 text-center">
            <div className="w-12 h-12 bg-[#2C2C2E] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2"
                   strokeLinecap="round" width="22" height="22">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <p className="text-white font-medium">Sin rutinas aún</p>
            <p className="text-[#8E8E93] text-sm mt-1">Crea una o guarda un entrenamiento como rutina</p>
            <button onClick={() => setCreando(true)} className="mt-4 text-[#30D158] font-semibold text-base">
              + Nueva rutina
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {plantillas.map(p => (
              <button
                key={p.id}
                onClick={() => onIniciar(p.id)}
                onContextMenu={e => { e.preventDefault(); setConfirmarEliminar(p.id) }}
                className="bg-[#1C1C1E] rounded-2xl p-4 flex-shrink-0 w-44 text-left active:opacity-80"
              >
                <p className="text-white font-bold text-base leading-tight mb-2 line-clamp-2">{p.nombre}</p>
                <p className="text-[#8E8E93] text-xs leading-relaxed">
                  {p.ejercicios.join(' · ')}{p.total > 3 ? ` +${p.total - 3}` : ''}
                </p>
                <p className="text-[#30D158] text-xs font-medium mt-2">{p.total} ejercicio{p.total !== 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recientes */}
      <div className="px-4 mt-6">
        <h2 className="text-[22px] font-bold mb-3">Recientes</h2>
        {recientes === null ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-5 text-center text-[#8E8E93] text-sm">Cargando...</div>
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
                    <p className="text-white font-semibold truncate">{w.nombre || 'Entrenamiento'}</p>
                    <p className="text-[#8E8E93] text-sm">{formatFecha(w.fechaFin)}</p>
                  </div>
                  <span className="text-[#30D158] text-sm font-medium shrink-0">
                    {formatDuracion(w.fechaInicio, w.fechaFin)}
                  </span>
                </div>
                {w.ejercicios.length > 0 && (
                  <p className="text-[#8E8E93] text-sm">
                    {w.ejercicios.join(' · ')}{w.total > 3 ? ` +${w.total - 3} más` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal eliminar plantilla */}
      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmarEliminar(null)} />
          <div className="relative w-full bg-[#1C1C1E] rounded-t-3xl px-6 pt-5 pb-6">
            <p className="text-white font-bold text-lg mb-1">¿Eliminar rutina?</p>
            <p className="text-[#8E8E93] text-sm mb-5">Esta acción no se puede deshacer.</p>
            <button
              onClick={() => handleEliminarPlantilla(confirmarEliminar)}
              className="w-full bg-[#FF3B30] text-white font-bold py-4 rounded-2xl mb-3 active:opacity-80"
            >
              Eliminar
            </button>
            <button
              onClick={() => setConfirmarEliminar(null)}
              className="w-full bg-[#2C2C2E] text-white font-semibold py-4 rounded-2xl active:opacity-80"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
