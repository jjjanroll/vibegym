import { useState, useEffect, useRef } from 'react'
import { getUser, saveUser, getAllWorkouts, getAllBodyWeights, saveBodyWeight, exportarDatos, importarDatos, getAllPRs, getAllExercises, getWorkoutExercises, getSets, getExercise } from '../db'

// ── Badges/Logros ─────────────────────────────────────────────────────────

const BADGES = [
  { id: 'primer_entreno', nombre: 'Primer paso',         emoji: '🎯', desc: 'Completaste tu primer entrenamiento',         check: ({ workouts }) => workouts.length >= 1 },
  { id: 'entrenos_10',    nombre: 'Tomando ritmo',        emoji: '🔟', desc: '10 entrenamientos completados',               check: ({ workouts }) => workouts.length >= 10 },
  { id: 'entrenos_50',    nombre: 'Dedicado',             emoji: '💪', desc: '50 entrenamientos completados',               check: ({ workouts }) => workouts.length >= 50 },
  { id: 'entrenos_100',   nombre: 'Centenario',           emoji: '💯', desc: '100 entrenamientos completados',              check: ({ workouts }) => workouts.length >= 100 },
  { id: 'primera_racha',  nombre: 'En racha',             emoji: '🔥', desc: 'Completaste una semana de racha',             check: ({ user }) => (user?.rachaMejor ?? 0) >= 1 },
  { id: 'racha_mes',      nombre: 'Imparable',            emoji: '⚡', desc: 'Mantuviste 4 semanas de racha',               check: ({ user }) => (user?.rachaMejor ?? 0) >= 4 },
  { id: 'racha_ano',      nombre: 'Leyenda',              emoji: '👑', desc: 'Un año entero de racha semanal',              check: ({ user }) => (user?.rachaMejor ?? 0) >= 52 },
  { id: 'primer_pr',      nombre: 'Personal Best',        emoji: '🥇', desc: 'Conseguiste tu primer récord personal',       check: ({ prsCount }) => prsCount >= 1 },
  { id: 'prs_5',          nombre: 'Máquina',              emoji: '🏆', desc: 'Récords personales en 5 ejercicios',          check: ({ prsCount }) => prsCount >= 5 },
  { id: 'madrugador',     nombre: 'Madrugador',           emoji: '🌅', desc: 'Entrenaste antes de las 8 de la mañana',      check: ({ workouts }) => workouts.some(w => w.fechaInicio && new Date(w.fechaInicio).getHours() < 8) },
  { id: 'nocturno',       nombre: 'Noctámbulo',           emoji: '🌙', desc: 'Entrenaste después de las 10 de la noche',    check: ({ workouts }) => workouts.some(w => w.fechaInicio && new Date(w.fechaInicio).getHours() >= 22) },
  { id: 'horas_10',       nombre: '10 horas sudadas',     emoji: '⏱️', desc: 'Pasaste 10 horas en total entrenando',        check: ({ horasTotal }) => horasTotal >= 10 },
]

function Logros({ user, onVolver }) {
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    async function cargar() {
      const [workouts, prMap] = await Promise.all([getAllWorkouts(), getAllPRs()])
      const completados = workouts.filter(w => w.fechaFin)
      const horasTotal = completados.reduce((sum, w) => {
        if (!w.fechaInicio || !w.fechaFin) return sum
        return sum + (new Date(w.fechaFin) - new Date(w.fechaInicio)) / 3600000
      }, 0)
      setDatos({ workouts: completados, prsCount: Object.keys(prMap).length, horasTotal })
    }
    cargar()
  }, [])

  const ctx = datos ? { workouts: datos.workouts, user, prsCount: datos.prsCount, horasTotal: datos.horasTotal } : null
  const ganados    = ctx ? BADGES.filter(b => b.check(ctx))  : []
  const bloqueados = ctx ? BADGES.filter(b => !b.check(ctx)) : []

  return (
    <div className="pb-8 screen-push">
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onVolver} className="text-[#30D158] font-medium text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>
          Yo
        </button>
      </div>
      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold">Logros</h1>
        <p className="text-[#8E8E93] text-sm mt-0.5">{datos ? `${ganados.length} de ${BADGES.length} desbloqueados` : ''}</p>
      </div>

      {datos === null ? (
        <div className="px-4 py-4 flex flex-col gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ position: 'relative', overflow: 'hidden' }}
                 className="bg-[#1C1C1E] rounded-2xl">
              <div className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#2C2C2E] rounded-xl shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 bg-[#2C2C2E] rounded-lg" style={{ width: `${50 + (i * 13) % 35}%` }} />
                  <div className="h-3 bg-[#2C2C2E] rounded-lg w-1/3" />
                </div>
              </div>
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {ganados.length > 0 && (
            <div className="px-4 mb-4">
              <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Desbloqueados</p>
              <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
                {ganados.map(badge => (
                  <div key={badge.id} className="px-5 py-4 flex items-center gap-4">
                    <span className="text-3xl">{badge.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{badge.nombre}</p>
                      <p className="text-[#8E8E93] text-sm">{badge.desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#30D158] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="#000"
                           strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bloqueados.length > 0 && (
            <div className="px-4">
              <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Por desbloquear</p>
              <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
                {bloqueados.map(badge => (
                  <div key={badge.id} className="px-5 py-4 flex items-center gap-4 opacity-40">
                    <span className="text-3xl grayscale">{badge.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{badge.nombre}</p>
                      <p className="text-[#8E8E93] text-sm">{badge.desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-[#3A3A3C] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Sub-pantalla: Volumen por músculo ────────────────────────────────────

const CATEGORIA_COLOR_VOL = {
  'Pecho':   '#0A84FF',
  'Espalda': '#FF6B35',
  'Hombros': '#BF5AF2',
  'Bíceps':  '#30D158',
  'Tríceps': '#32D74B',
  'Piernas': '#FF9500',
  'Core':    '#FF2D55',
  'Cardio':  '#64D2FF',
}

function VolumenMuscular({ unidad, onVolver }) {
  const [datos, setDatos] = useState(null)
  const conv = (kg) => unidad === 'lb' ? +(kg * 2.205).toFixed(0) : Math.round(kg)

  useEffect(() => {
    async function cargar() {
      const hace30 = new Date()
      hace30.setDate(hace30.getDate() - 30)
      const todos = await getAllWorkouts()
      const recientes = todos.filter(w => w.fechaFin && new Date(w.fechaFin) >= hace30)

      const volumenPorCategoria = {}

      await Promise.all(recientes.map(async w => {
        const wes = await getWorkoutExercises(w.id)
        await Promise.all(wes.map(async we => {
          const [ej, sets] = await Promise.all([getExercise(we.exerciseId), getSets(we.id)])
          const cat = ej?.categoria
          if (!cat) return
          const vol = sets.filter(s => s.completada).reduce((sum, s) => sum + (s.peso || 0) * (s.reps || 0), 0)
          if (vol > 0) volumenPorCategoria[cat] = (volumenPorCategoria[cat] ?? 0) + vol
        }))
      }))

      const lista = Object.entries(volumenPorCategoria)
        .map(([cat, kg]) => ({ cat, kg }))
        .sort((a, b) => b.kg - a.kg)

      setDatos(lista)
    }
    cargar()
  }, [])

  const maxKg = datos && datos.length > 0 ? datos[0].kg : 1

  return (
    <div className="pb-8 screen-push">
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onVolver} className="text-[#30D158] font-medium text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>
          Yo
        </button>
      </div>
      <div className="px-4 mb-1">
        <h1 className="text-2xl font-bold">Volumen por músculo</h1>
        <p className="text-[#8E8E93] text-sm mt-0.5">Últimos 30 días</p>
      </div>

      {datos === null ? (
        <div className="px-4 py-4 flex flex-col gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ position: 'relative', overflow: 'hidden' }} className="rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="h-3 bg-[#2C2C2E] rounded" style={{ width: `${60 + (i * 7) % 30}px` }} />
                <div className="h-3 bg-[#2C2C2E] rounded w-12" />
              </div>
              <div className="h-2 bg-[#2C2C2E] rounded-full w-full" />
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            </div>
          ))}
        </div>
      ) : datos.length === 0 ? (
        <div className="px-4 mt-4">
          <div className="bg-[#1C1C1E] rounded-2xl p-6 text-center">
            <p className="text-white font-medium mb-1">Sin datos aún</p>
            <p className="text-[#8E8E93] text-sm">Completa entrenamientos para ver tu distribución muscular</p>
          </div>
        </div>
      ) : (
        <div className="px-4 mt-4">
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
            {datos.map(({ cat, kg }) => {
              const color = CATEGORIA_COLOR_VOL[cat] ?? '#8E8E93'
              const pct = (kg / maxKg) * 100
              const label = unidad === 'lb' ? `${+(kg * 2.205).toFixed(0)} lb` : `${Math.round(kg)} kg`
              return (
                <div key={cat} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{cat}</span>
                    <span className="text-[#8E8E93] text-sm">{label}</span>
                  </div>
                  <div className="h-2 bg-[#2C2C2E] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[#8E8E93] text-xs text-center mt-3">
            {datos.length} grupo{datos.length !== 1 ? 's' : ''} musculares entrenados
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-pantalla: Récords personales ─────────────────────────────────────

function Records({ unidad, onVolver }) {
  const [prs, setPrs] = useState(null) // [{ ejercicio, peso, reps, rm1 }]
  const conv = (kg) => unidad === 'lb' ? +(kg * 2.205).toFixed(1) : kg

  useEffect(() => {
    async function cargar() {
      const [prMap, ejercicios] = await Promise.all([getAllPRs(), getAllExercises()])
      const ejercicioMap = Object.fromEntries(ejercicios.map(e => [e.id, e]))
      const lista = Object.entries(prMap)
        .map(([exId, pr]) => ({ ejercicio: ejercicioMap[exId], ...pr }))
        .filter(item => item.ejercicio)
        .sort((a, b) => b.rm1 - a.rm1)
      setPrs(lista)
    }
    cargar()
  }, [])

  return (
    <div className="pb-8 screen-push">
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onVolver} className="text-[#30D158] font-medium text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>
          Yo
        </button>
      </div>
      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold">Récords personales</h1>
      </div>

      {prs === null ? (
        <div className="px-4 py-4 flex flex-col gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ position: 'relative', overflow: 'hidden' }}
                 className="bg-[#1C1C1E] rounded-2xl">
              <div className="p-4 flex items-center gap-3">
                <div className="w-6 h-6 bg-[#2C2C2E] rounded-lg shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 bg-[#2C2C2E] rounded-lg" style={{ width: `${50 + (i * 13) % 35}%` }} />
                  <div className="h-3 bg-[#2C2C2E] rounded-lg w-1/4" />
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <div className="h-4 bg-[#2C2C2E] rounded w-20" />
                  <div className="h-3 bg-[#2C2C2E] rounded w-14" />
                </div>
              </div>
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            </div>
          ))}
        </div>
      ) : prs.length === 0 ? (
        <div className="px-4">
          <div className="bg-[#1C1C1E] rounded-2xl p-6 text-center">
            <p className="text-white font-medium mb-1">Sin récords aún</p>
            <p className="text-[#8E8E93] text-sm">Completa series en tus entrenamientos para ver tus PRs</p>
          </div>
        </div>
      ) : (
        <div className="px-4">
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
            {prs.map((item, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <span className="text-[#8E8E93] text-sm w-6 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{item.ejercicio.nombre}</p>
                  <p className="text-[#8E8E93] text-sm">{item.ejercicio.categoria}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[#30D158] font-bold">{conv(item.peso)} {unidad} × {item.reps}</p>
                  <p className="text-[#8E8E93] text-xs">1RM ~{conv(Math.round(item.rm1 * 10) / 10)}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[#8E8E93] text-xs text-center mt-3">
            {prs.length} récord{prs.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-pantalla: Configuración ───────────────────────────────────────────

function Configuracion({ user, onGuardar, onVolver }) {
  const [unidad, setUnidad] = useState(user?.unidad ?? 'kg')
  const [timer, setTimer] = useState(user?.timerSegundos ?? 90)

  async function guardar() {
    await saveUser({ ...(user || { id: 1 }), unidad, timerSegundos: timer })
    onGuardar({ unidad, timerSegundos: timer })
    onVolver()
  }

  return (
    <div className="pb-8 screen-push">
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onVolver} className="text-[#30D158] font-medium text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>
          Yo
        </button>
      </div>
      <div className="px-4 mb-1">
        <h1 className="text-2xl font-bold">Configuración</h1>
      </div>

      {/* Unidades */}
      <div className="px-4 mt-4">
        <p className="text-[#8E8E93] text-xs font-medium uppercase tracking-wider mb-2 px-1">Unidades de peso</p>
        <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
          {['kg', 'lb'].map(u => (
            <button
              key={u}
              onClick={() => setUnidad(u)}
              className="w-full px-5 py-4 flex items-center justify-between active:bg-[#2C2C2E]"
            >
              <span className="text-white font-medium">{u === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}</span>
              {unidad === u && (
                <div className="w-5 h-5 rounded-full bg-[#30D158] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="#000"
                       strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="text-[#8E8E93] text-xs px-1 mt-2">
          {unidad === 'lb'
            ? '1 kg = 2.205 lb. El peso se convierte automáticamente al registrar.'
            : 'Pesos registrados en kilogramos.'}
        </p>
      </div>

      {/* Timer de descanso */}
      <div className="px-4 mt-5">
        <p className="text-[#8E8E93] text-xs font-medium uppercase tracking-wider mb-2 px-1">Timer de descanso</p>
        <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
          {[30, 60, 90, 120, 180, 240].map(seg => (
            <button
              key={seg}
              onClick={() => setTimer(seg)}
              className="w-full px-5 py-3.5 flex items-center justify-between active:bg-[#2C2C2E]"
            >
              <span className="text-white">{seg < 60 ? `${seg}s` : `${seg / 60}min`}</span>
              {timer === seg && (
                <div className="w-5 h-5 rounded-full bg-[#30D158] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="#000"
                       strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <button
          onClick={guardar}
          className="w-full bg-[#30D158] text-black font-bold text-base py-4 rounded-2xl active:opacity-80"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

// ── Sub-pantalla: Registrar peso corporal ─────────────────────────────────

function RegistrarPeso({ user, onGuardar, onVolver }) {
  const unidad = user?.unidad ?? 'kg'
  const [valor, setValor] = useState('')
  const [registros, setRegistros] = useState([])

  useEffect(() => {
    getAllBodyWeights().then(setRegistros)
  }, [])

  async function guardar() {
    const kg = unidad === 'lb' ? parseFloat(valor) / 2.205 : parseFloat(valor)
    if (!kg || isNaN(kg)) return
    await saveBodyWeight({ peso: Math.round(kg * 10) / 10, fecha: new Date().toISOString(), notas: null })
    const actualizados = await getAllBodyWeights()
    setRegistros(actualizados)
    setValor('')
    onGuardar(kg)
  }

  const convertir = (kg) => unidad === 'lb' ? +(kg * 2.205).toFixed(1) : kg

  // Gráfica SVG simple
  function GraficaPeso({ datos, unidad }) {
    if (datos.length < 2) return null
    const pts = [...datos].reverse() // cronológico
    const pesos = pts.map(r => convertir(r.peso))
    const min = Math.min(...pesos)
    const max = Math.max(...pesos)
    const rango = max - min || 1
    const W = 300, H = 80, PAD = 8
    const xStep = (W - PAD * 2) / (pts.length - 1)
    const toY = (p) => PAD + (1 - (p - min) / rango) * (H - PAD * 2)
    const toX = (i) => PAD + i * xStep

    const d = pts.map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(pesos[i]).toFixed(1)}`).join(' ')
    const area = `${d} L${toX(pts.length - 1).toFixed(1)},${H} L${PAD},${H} Z`

    return (
      <div className="mx-4 mt-3 bg-[#1C1C1E] rounded-2xl overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#30D158" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#30D158" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={area} fill="url(#pesoGrad)"/>
          <path d={d} fill="none" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {pts.map((r, i) => (
            <circle key={i} cx={toX(i)} cy={toY(pesos[i])} r="3" fill="#30D158"/>
          ))}
        </svg>
        <div className="flex justify-between px-4 pb-3 text-xs text-[#8E8E93]">
          <span>{new Date(pts[0].fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
          <span className="text-[#30D158] font-semibold">{pesos[pesos.length - 1]} {unidad}</span>
          <span>{new Date(pts[pts.length - 1].fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8 screen-push">
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onVolver} className="text-[#30D158] font-medium text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>
          Yo
        </button>
      </div>
      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold">Peso corporal</h1>
      </div>

      {/* Input */}
      <div className="px-4">
        <div className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3">
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder={`Peso en ${unidad}`}
            className="flex-1 bg-transparent text-white text-xl font-bold outline-none placeholder-[#3A3A3C]"
          />
          <span className="text-[#8E8E93] font-medium">{unidad}</span>
          <button
            onClick={guardar}
            className="bg-[#30D158] text-black font-bold px-4 py-2 rounded-xl text-sm active:opacity-80"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Gráfica */}
      {registros.length >= 2 && <GraficaPeso datos={registros} unidad={unidad} />}

      {/* Historial */}
      {registros.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-[#8E8E93] text-xs font-medium uppercase tracking-wider mb-2 px-1">Registros</p>
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
            {registros.slice(0, 10).map((r, i) => (
              <div key={r.id ?? i} className="flex items-center justify-between px-5 py-3">
                <span className="text-[#8E8E93] text-sm">
                  {new Date(r.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-white font-semibold">{convertir(r.peso)} {unidad}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pantalla principal Yo ─────────────────────────────────────────────────

export default function Yo() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ entrenos: 0, horas: 0 })
  const [vista, setVista] = useState('main') // 'main' | 'config' | 'peso' | 'records' | 'logros' | 'volumen'
  const [importPending, setImportPending] = useState(null) // { json, resumen }
  const [importEstado, setImportEstado] = useState(null)   // 'ok' | 'error' | null
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    getUser().then(setUser)
    getAllWorkouts().then(todos => {
      const completados = todos.filter(w => w.fechaFin)
      const entrenos = completados.length
      const horas = completados.reduce((sum, w) => {
        if (!w.fechaInicio || !w.fechaFin) return sum
        return sum + (new Date(w.fechaFin) - new Date(w.fechaInicio)) / 3600000
      }, 0)
      setStats({ entrenos, horas: Math.floor(horas) })
    })
  }, [])

  const nombre = user?.nombre ?? 'Atleta'
  const inicial = nombre.charAt(0).toUpperCase()
  const unidad = user?.unidad ?? 'kg'

  function handleConfigGuardar(cambios) {
    setUser(prev => ({ ...(prev || { id: 1 }), ...cambios }))
  }

  async function handleExportar() {
    const datos = await exportarDatos()
    const json = JSON.stringify(datos, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fecha = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `vibegym-backup-${fecha}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportarClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result)
        if (!json || json.version !== 1) throw new Error('Versión de backup incompatible.')
        const fecha = json.exportadoEn
          ? new Date(json.exportadoEn).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'desconocida'
        setImportPending({
          json,
          resumen: `${json.workouts?.length ?? 0} entrenamientos · exportado el ${fecha}`,
        })
      } catch {
        setImportError('El archivo no es un backup válido de VibeGym.')
        setImportEstado('error')
      }
    }
    reader.readAsText(file)
  }

  async function confirmarImport() {
    try {
      await importarDatos(importPending.json)
      setImportPending(null)
      setImportEstado('ok')
      // Recargar datos del usuario
      const u = await getUser()
      setUser(u)
      const todos = await getAllWorkouts()
      setStats({ entrenos: todos.filter(w => w.fechaFin).length })
    } catch (err) {
      setImportPending(null)
      setImportError(err.message ?? 'Error al importar.')
      setImportEstado('error')
    }
  }

  function handlePesoGuardar(kg) {
    const pesoMostrar = unidad === 'lb' ? (kg * 2.205).toFixed(1) : kg
    setUser(prev => ({ ...(prev || { id: 1 }), peso: kg, pesoMostrar }))
  }

  if (vista === 'config') {
    return <Configuracion user={user} onGuardar={handleConfigGuardar} onVolver={() => setVista('main')} />
  }

  if (vista === 'peso') {
    return <RegistrarPeso user={user} onGuardar={handlePesoGuardar} onVolver={() => setVista('main')} />
  }

  if (vista === 'records') {
    return <Records unidad={unidad} onVolver={() => setVista('main')} />
  }

  if (vista === 'logros') {
    return <Logros user={user} onVolver={() => setVista('main')} />
  }

  if (vista === 'volumen') {
    return <VolumenMuscular unidad={unidad} onVolver={() => setVista('main')} />
  }

  const pesoActual = user?.peso
    ? (unidad === 'lb' ? `${(user.peso * 2.205).toFixed(1)} lb` : `${user.peso} kg`)
    : null

  return (
    <div className="pb-8">
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-[34px] font-bold tracking-tight">Yo</h1>
      </div>

      {/* Tarjeta de perfil */}
      <div className="px-4 mt-4">
        <div className="bg-[#1C1C1E] rounded-2xl px-5 py-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-[#30D158] rounded-full flex items-center justify-center shrink-0">
            <span className="text-black text-2xl font-bold">{inicial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-xl font-bold truncate">{nombre}</h2>
            <p className="text-[#8E8E93] text-sm mt-0.5">
              {pesoActual ?? 'Sin peso registrado'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-3">
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <p className="text-3xl font-bold text-white">{stats.entrenos}</p>
          <p className="text-[#8E8E93] text-sm mt-1">Entrenamientos</p>
        </div>
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <p className="text-3xl font-bold text-[#FF9500]">
            {user?.rachaMejor ?? 0}
            <span className="text-lg font-semibold"> sem</span>
          </p>
          <p className="text-[#8E8E93] text-sm mt-1">Mejor racha</p>
        </div>
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <p className="text-3xl font-bold text-white">
            {stats.horas}
            <span className="text-lg font-semibold text-[#8E8E93]"> h</span>
          </p>
          <p className="text-[#8E8E93] text-sm mt-1">Horas en el gym</p>
        </div>
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <p className="text-3xl font-bold text-white">{unidad}</p>
          <p className="text-[#8E8E93] text-sm mt-1">Unidad de peso</p>
        </div>
      </div>

      {/* Opciones */}
      <div className="px-4 mt-3">
        <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
          {[
            { label: 'Peso corporal', sub: pesoActual ?? 'Sin registros', accion: () => setVista('peso') },
            { label: 'Logros', sub: 'Tus badges y trofeos 🏅', accion: () => setVista('logros') },
            { label: 'Volumen por músculo', sub: 'Distribución últimos 30 días 📊', accion: () => setVista('volumen') },
            { label: 'Récords personales', sub: 'Tus mejores marcas 🏆', accion: () => setVista('records') },
            { label: 'Configuración', sub: `Unidades: ${unidad} · Timer: ${(user?.timerSegundos ?? 90)}s`, accion: () => setVista('config') },
            { label: 'Exportar datos', sub: 'Descarga backup JSON', accion: handleExportar },
            { label: 'Importar datos', sub: 'Restaurar desde backup JSON', accion: handleImportarClick },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.accion}
              className="w-full px-5 py-4 flex items-center justify-between active:bg-[#2C2C2E]"
            >
              <div className="text-left">
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-[#8E8E93] text-sm">{item.sub}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.5"
                   strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modal: confirmación de importar */}
      {importPending && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="absolute inset-0 bg-black/60" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={() => setImportPending(null)} />
          <div className="relative w-full bg-[#1C1C1E] rounded-t-3xl px-6 pt-6 pb-8">
            <div className="w-10 h-1 bg-[#38383A] rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold text-white mb-1">Importar datos</h2>
            <p className="text-[#8E8E93] text-sm mb-1">
              Esto reemplazará <span className="text-white font-semibold">todos tus datos actuales</span>.
            </p>
            <p className="text-[#8E8E93] text-sm mb-6">{importPending.resumen}</p>
            <button
              onClick={confirmarImport}
              className="w-full bg-[#FF3B30] text-white font-bold py-4 rounded-2xl mb-3 active:opacity-80"
            >
              Sí, importar y reemplazar
            </button>
            <button
              onClick={() => setImportPending(null)}
              className="w-full bg-[#2C2C2E] text-white font-semibold py-4 rounded-2xl active:opacity-80"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: resultado */}
      {importEstado && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="absolute inset-0 bg-black/60" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={() => setImportEstado(null)} />
          <div className="relative w-full bg-[#1C1C1E] rounded-t-3xl px-6 pt-6 pb-8">
            <div className="w-10 h-1 bg-[#38383A] rounded-full mx-auto mb-5" />
            {importEstado === 'ok' ? (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Importación exitosa</h2>
                <p className="text-[#8E8E93] text-sm mb-6">Tus datos han sido restaurados correctamente.</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Error al importar</h2>
                <p className="text-[#8E8E93] text-sm mb-6">{importError}</p>
              </>
            )}
            <button
              onClick={() => setImportEstado(null)}
              className="w-full bg-[#2C2C2E] text-white font-semibold py-4 rounded-2xl active:opacity-80"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
