import { useState, useEffect } from 'react'
import { getAllExercises, getPRForExercise, getWorkoutExercises, getAllWorkouts, getSets, getUser } from '../db'

const CATEGORIAS = ['Todas', 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Core', 'Cardio']

const CATEGORIA_STYLE = {
  'Pecho':    { bg: '#0A84FF', text: 'Pe' },
  'Espalda':  { bg: '#FF6B35', text: 'Es' },
  'Hombros':  { bg: '#BF5AF2', text: 'Ho' },
  'Bíceps':   { bg: '#30D158', text: 'Bi' },
  'Tríceps':  { bg: '#32D74B', text: 'Tr' },
  'Piernas':  { bg: '#FF9500', text: 'Pi' },
  'Core':     { bg: '#FF2D55', text: 'Co' },
  'Cardio':   { bg: '#64D2FF', text: 'Ca' },
}

function CategoriaBadge({ categoria }) {
  const s = CATEGORIA_STYLE[categoria] ?? { bg: '#8E8E93', text: '?' }
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-black"
      style={{ backgroundColor: s.bg }}
    >
      {s.text}
    </div>
  )
}

// ── Detalle de ejercicio ──────────────────────────────────────────────────

function DetalleEjercicio({ ejercicio, onVolver, unidad = 'kg' }) {
  const [pr, setPr] = useState(null)
  const [historial, setHistorial] = useState(null) // [{ fecha, sets }]
  const conv = (kg) => unidad === 'lb' ? +(kg * 2.205).toFixed(1) : kg

  useEffect(() => {
    getPRForExercise(ejercicio.id).then(setPr)

    async function cargarHistorial() {
      const workouts = (await getAllWorkouts()).filter(w => w.fechaFin).sort((a, b) => new Date(b.fechaFin) - new Date(a.fechaFin))
      const entries = []
      for (const w of workouts.slice(0, 5)) {
        const wes = await getWorkoutExercises(w.id)
        const we = wes.find(we => we.exerciseId === ejercicio.id)
        if (!we) continue
        const sets = await getSets(we.id)
        const completadas = sets.filter(s => s.completada && (s.peso || s.reps || s.tiempo))
        if (completadas.length > 0) {
          entries.push({ fecha: w.fechaFin, nombre: w.nombre, sets: completadas })
        }
      }
      setHistorial(entries)
    }
    cargarHistorial()
  }, [ejercicio.id])

  const esCardio = ejercicio.tipo === 'cardio'

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <button onClick={onVolver} className="text-[#30D158] font-medium text-sm flex items-center gap-1 mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="16" height="16"><path d="M15 18l-6-6 6-6"/></svg>
          Ejercicios
        </button>
        <div className="flex items-center gap-3">
          <CategoriaBadge categoria={ejercicio.categoria} />
          <div>
            <h1 className="text-2xl font-bold text-white">{ejercicio.nombre}</h1>
            <p className="text-[#8E8E93] text-sm">{ejercicio.musculoPrincipal} · {ejercicio.categoria}</p>
          </div>
        </div>
      </div>

      {/* PR */}
      {pr && (
        <div className="mx-4 mb-3 bg-[#0A1F10] border border-[#30D158]/30 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-[#30D158] font-bold text-lg">
              {conv(pr.peso)} {unidad} × {pr.reps} reps
            </p>
            <p className="text-[#8E8E93] text-sm">1RM estimado: {conv(Math.round(pr.rm1 * 10) / 10)} {unidad}</p>
          </div>
        </div>
      )}

      {/* Instrucciones si existen */}
      {ejercicio.descripcion && (
        <div className="mx-4 mb-3 bg-[#1C1C1E] rounded-2xl p-4">
          <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2">Instrucciones</p>
          <p className="text-white text-sm leading-relaxed">{ejercicio.descripcion}</p>
        </div>
      )}

      {/* Músculos secundarios */}
      {ejercicio.musculosSecundarios?.length > 0 && (
        <div className="mx-4 mb-3 bg-[#1C1C1E] rounded-2xl p-4">
          <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2">Músculos secundarios</p>
          <p className="text-white text-sm">{ejercicio.musculosSecundarios.join(', ')}</p>
        </div>
      )}

      {/* Historial */}
      <div className="px-4 mt-2">
        <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Historial reciente</p>
        {historial === null ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-4 text-center text-[#8E8E93] text-sm">
            Cargando...
          </div>
        ) : historial.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-4 text-center text-[#8E8E93] text-sm">
            Sin registros aún
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {historial.map((entry, i) => (
              <div key={i} className="bg-[#1C1C1E] rounded-2xl p-4">
                <p className="text-[#8E8E93] text-xs mb-2">
                  {new Date(entry.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex flex-col gap-1">
                  {entry.sets.map((s, j) => (
                    <div key={j} className="flex gap-4 text-sm">
                      <span className="text-[#8E8E93] w-5">{j + 1}</span>
                      {esCardio ? (
                        <span className="text-white">
                          {s.tiempo ? `${s.tiempo} min` : ''}
                          {s.distancia ? ` · ${s.distancia} km` : ''}
                        </span>
                      ) : (
                        <span className="text-white">
                          {conv(s.peso)} {unidad} × {s.reps} reps
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pantalla principal ────────────────────────────────────────────────────

export default function Ejercicios() {
  const [ejercicios, setEjercicios] = useState([])
  const [categoria, setCategoria] = useState('Todas')
  const [busqueda, setBusqueda]   = useState('')
  const [seleccionado, setSeleccionado] = useState(null)
  const [unidad, setUnidad] = useState('kg')

  useEffect(() => {
    getAllExercises().then(todos =>
      setEjercicios(todos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    )
    getUser().then(u => { if (u?.unidad) setUnidad(u.unidad) })
  }, [])

  const filtrados = ejercicios.filter(e => {
    const okCat = categoria === 'Todas' || e.categoria === categoria
    const okTxt = e.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return okCat && okTxt
  })

  if (seleccionado) {
    return (
      <DetalleEjercicio
        ejercicio={seleccionado}
        unidad={unidad}
        onVolver={() => setSeleccionado(null)}
      />
    )
  }

  return (
    <div className="pb-8">

      <div className="px-4 pt-5 pb-3">
        <h1 className="text-[34px] font-bold tracking-tight">Ejercicios</h1>
      </div>

      {/* Buscador */}
      <div className="px-4 pb-3">
        <div className="flex items-center bg-[#1C1C1E] rounded-xl px-3 gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2"
               strokeLinecap="round" width="18" height="18">
            <circle cx="11" cy="11" r="7"/>
            <line x1="16.5" y1="16.5" x2="21" y2="21"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 bg-transparent text-white py-2.5 text-base placeholder-[#8E8E93] outline-none"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}>
              <svg viewBox="0 0 24 24" fill="#8E8E93" width="18" height="18">
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm3.54 12.46a1 1 0 0 1-1.42 1.42L12 13.41l-2.12 2.47a1 1 0 0 1-1.42-1.42L10.59 12 8.46 9.54a1 1 0 1 1 1.42-1.42L12 10.59l2.12-2.47a1 1 0 1 1 1.42 1.42L13.41 12l2.13 2.46z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filtros de categoría */}
      <div className="flex gap-2 px-4 pb-4 overflow-x-auto no-scrollbar">
        {CATEGORIAS.map(c => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              categoria === c
                ? 'bg-[#30D158] text-black'
                : 'bg-[#1C1C1E] text-[#8E8E93]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="px-4">
        <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
          {filtrados.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#8E8E93]">
              Sin resultados para "{busqueda}"
            </div>
          ) : (
            filtrados.map(e => (
              <button
                key={e.id}
                onClick={() => setSeleccionado(e)}
                className="w-full px-4 py-3 flex items-center gap-3 active:bg-[#2C2C2E] text-left"
              >
                <CategoriaBadge categoria={e.categoria} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-base font-medium leading-tight truncate">{e.nombre}</p>
                  <p className="text-[#8E8E93] text-sm">{e.musculoPrincipal}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="#38383A" strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="shrink-0">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))
          )}
        </div>
        {filtrados.length > 0 && (
          <p className="text-[#8E8E93] text-xs text-center mt-3">
            {filtrados.length} ejercicio{filtrados.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

    </div>
  )
}
