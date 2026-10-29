import { useState, useEffect, useRef } from 'react'
import { getAllWorkouts, getWorkoutExercises, getExercise, getAllTemplates, getTemplateExercises, saveTemplate, saveTemplateExercise, deleteTemplateExercise, deleteTemplate, saveUser, getLunes } from '../db'
import SelectorEjercicios from './SelectorEjercicios'

function formatDuracion(inicio, fin) {
  if (!inicio || !fin) return ''
  const mins = Math.round((new Date(fin) - new Date(inicio)) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function mensajeAusencia(recientes) {
  if (!recientes) return null
  if (recientes.length === 0) return '¡Tu primer entreno te espera!'
  const ultimo = new Date(recientes[0].fechaFin)
  const hoy = new Date()
  const dias = Math.floor((hoy - ultimo) / 86400000)
  if (dias === 0) return '¡Ya entrenaste hoy! 🔥'
  if (dias === 1) return 'Ayer entrenaste — ¿un día más?'
  if (dias <= 5) return `Llevas ${dias} días sin entrenar`
  if (dias <= 13) return 'El gym te está esperando 💪'
  return 'Ha pasado un tiempo — ¡volvamos!'
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
  const [nombre, setNombre] = useState('')
  const [ejercicios, setEjercicios] = useState([])
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
        onCerrar={() => setSeleccionando(false)}
      />
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="shrink-0 px-4 pt-5 pb-3 flex items-center gap-3 border-b border-[#38383A]">
        <button onClick={onCancelar} className="text-[#30D158] font-medium text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>
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

// ── Editar plantilla existente ────────────────────────────────────────────

function EditarPlantilla({ plantilla, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(plantilla.nombre)
  const [ejercicios, setEjercicios] = useState([])
  const [seleccionando, setSeleccionando] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const tes = await getTemplateExercises(plantilla.id)
      const loaded = await Promise.all(tes.map(async te => {
        const ej = await getExercise(te.exerciseId)
        return { id: ej?.id ?? te.exerciseId, nombre: ej?.nombre ?? '?', tipo: ej?.tipo ?? 'fuerza', teId: te.id }
      }))
      setEjercicios(loaded)
      setCargando(false)
    }
    cargar()
  }, [plantilla.id])

  async function guardar() {
    if (!nombre.trim() || ejercicios.length === 0) return
    await saveTemplate({ id: plantilla.id, nombre: nombre.trim(), creadoEn: plantilla.creadoEn })
    await Promise.all(ejercicios.map(e => e.teId ? deleteTemplateExercise(e.teId) : Promise.resolve()))
    for (let i = 0; i < ejercicios.length; i++) {
      await saveTemplateExercise({ templateId: plantilla.id, exerciseId: ejercicios[i].id, orden: i + 1, seriesDefault: 3 })
    }
    onGuardar()
  }

  function mover(i, dir) {
    const j = i + dir
    if (j < 0 || j >= ejercicios.length) return
    const arr = [...ejercicios]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setEjercicios(arr)
  }

  if (seleccionando) {
    return (
      <SelectorEjercicios
        onSeleccionar={ej => {
          setEjercicios(prev => prev.find(e => e.id === ej.id) ? prev : [...prev, { id: ej.id, nombre: ej.nombre, tipo: ej.tipo, teId: null }])
          setSeleccionando(false)
        }}
        onCerrar={() => setSeleccionando(false)}
      />
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="shrink-0 px-4 pt-5 pb-3 flex items-center gap-3 border-b border-[#38383A]">
        <button onClick={onCancelar} className="text-[#30D158] font-medium text-sm flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>
          Cancelar
        </button>
        <h1 className="text-lg font-bold flex-1">Editar rutina</h1>
        <button
          onClick={guardar}
          disabled={!nombre.trim() || ejercicios.length === 0 || cargando}
          className="text-[#30D158] font-semibold disabled:opacity-30"
        >
          Guardar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-4 mt-4">
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre de la rutina"
            className="w-full bg-[#1C1C1E] text-white text-xl font-semibold px-5 py-4 rounded-2xl outline-none placeholder-[#3A3A3C]"
          />
        </div>

        <div className="px-4 mt-5">
          <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Ejercicios</p>
          {cargando ? (
            <div className="bg-[#1C1C1E] rounded-2xl p-4 text-center text-[#8E8E93] text-sm">Cargando...</div>
          ) : (
            <>
              {ejercicios.length > 0 && (
                <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A] mb-3">
                  {ejercicios.map((ej, i) => (
                    <div key={`${ej.id}-${i}`} className="flex items-center px-4 py-3.5 gap-2">
                      <span className="text-[#8E8E93] text-sm w-5 shrink-0">{i + 1}</span>
                      <span className="text-white flex-1 text-sm">{ej.nombre}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => mover(i, -1)}
                          disabled={i === 0}
                          className="w-7 h-7 bg-[#3A3A3C] rounded-lg flex items-center justify-center text-[#AEAEB2] text-xs active:opacity-70 disabled:opacity-20"
                        >↑</button>
                        <button
                          onClick={() => mover(i, 1)}
                          disabled={i === ejercicios.length - 1}
                          className="w-7 h-7 bg-[#3A3A3C] rounded-lg flex items-center justify-center text-[#AEAEB2] text-xs active:opacity-70 disabled:opacity-20"
                        >↓</button>
                        <button
                          onClick={() => setEjercicios(prev => prev.filter((_, j) => j !== i))}
                          className="w-7 h-7 flex items-center justify-center text-[#FF3B30] text-sm active:opacity-70"
                        >✕</button>
                      </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sheet de detalle de plantilla ─────────────────────────────────────────

function PlantillaSheet({ plantilla, onCerrar, onIniciar, onEditar, onEliminar }) {
  const [ejerciciosCargados, setEjerciciosCargados] = useState([])
  const [historialCargado, setHistorialCargado] = useState([])
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)

  useEffect(() => {
    async function cargar() {
      const tes = await getTemplateExercises(plantilla.id)
      const nombres = await Promise.all(tes.map(te => getExercise(te.exerciseId).then(e => e?.nombre ?? '?')))
      setEjerciciosCargados(nombres)

      const todos = await getAllWorkouts()
      const relacionados = todos
        .filter(w => w.templateId === plantilla.id && w.fechaFin)
        .sort((a, b) => new Date(b.fechaFin) - new Date(a.fechaFin))
        .slice(0, 3)
      setHistorialCargado(relacionados)
    }
    cargar()
  }, [plantilla.id])

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/70"
        style={{ backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', cursor: 'pointer' }}
        onClick={onCerrar}
        onTouchEnd={e => { e.preventDefault(); onCerrar() }}
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-50 bg-[#1C1C1E] rounded-t-3xl flex flex-col"
        style={{
          maxHeight: '90dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'sheetUp 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle + cerrar */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-3 pb-1">
          <div className="w-8" />
          <div className="w-12 h-1.5 bg-[#48484A] rounded-full" />
          <button
            onClick={onCerrar}
            className="w-8 h-8 bg-[#3A3A3C] rounded-full flex items-center justify-center active:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#EBEBF5" strokeWidth="2.5"
                 strokeLinecap="round" width="13" height="13">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-6">
          {/* Nombre + chip */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white leading-tight">{plantilla.nombre}</h2>
            </div>
            <span className="shrink-0 mt-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#30D158]/20 text-[#30D158]">
              {plantilla.total} ejercicio{plantilla.total !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Lista de ejercicios */}
          <div className="mb-5">
            <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2">Ejercicios</p>
            <div className="bg-[#2C2C2E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
              {ejerciciosCargados.length === 0 ? (
                <div className="px-4 py-3 text-[#8E8E93] text-sm">Cargando...</div>
              ) : ejerciciosCargados.map((nombre, i) => (
                <div key={i} className="flex items-center px-4 py-3 gap-3">
                  <span className="text-[#8E8E93] text-sm w-5 shrink-0">{i + 1}</span>
                  <span className="text-white text-sm flex-1">{nombre}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Historial */}
          <div className="mb-6">
            <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2">Últimas veces</p>
            {historialCargado.length === 0 ? (
              <div className="bg-[#2C2C2E] rounded-2xl px-4 py-3">
                <p className="text-[#8E8E93] text-sm">Nunca realizada</p>
              </div>
            ) : (
              <div className="bg-[#2C2C2E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
                {historialCargado.map(w => (
                  <div key={w.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-white text-sm">{formatFecha(w.fechaFin)}</span>
                    <span className="text-[#30D158] text-sm font-medium">{formatDuracion(w.fechaInicio, w.fechaFin)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acciones principales */}
          <button
            onClick={() => { onIniciar(plantilla.id); onCerrar() }}
            className="w-full bg-[#30D158] text-black font-bold text-base py-4 rounded-2xl mb-3 active:opacity-80"
          >
            Empezar entrenamiento
          </button>
          <button
            onClick={onEditar}
            className="w-full bg-[#2C2C2E] text-white font-semibold text-base py-4 rounded-2xl mb-5 active:opacity-80"
          >
            Editar rutina
          </button>

          {/* Eliminar */}
          <div className="border-t border-[#38383A] pt-4">
            {!confirmandoEliminar ? (
              <button
                onClick={() => setConfirmandoEliminar(true)}
                className="w-full bg-[#2C2C2E] text-[#FF3B30] font-semibold text-base py-4 rounded-2xl active:opacity-80"
              >
                Eliminar rutina
              </button>
            ) : (
              <div className="bg-[#2C2C2E] rounded-2xl p-4">
                <p className="text-white font-semibold mb-1">¿Eliminar esta rutina?</p>
                <p className="text-[#8E8E93] text-sm mb-4">Esta acción no se puede deshacer.</p>
                <button
                  onClick={onEliminar}
                  className="w-full bg-[#FF3B30] text-white font-bold py-3 rounded-xl mb-2 active:opacity-80"
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={() => setConfirmandoEliminar(false)}
                  className="w-full bg-[#3A3A3C] text-white font-semibold py-3 rounded-xl active:opacity-80"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  )
}

// ── Frase del día ────────────────────────────────────────────────────────

const FRASES_DIA = [
  'El dolor de hoy es la fuerza de mañana.',
  'La disciplina es elegir entre lo que quieres ahora y lo que quieres más.',
  'No se trata de tener tiempo, se trata de hacer tiempo.',
  'Un entrenamiento que no quieres hacer es el que más necesitas.',
  'Los resultados llegan cuando dejas de buscar motivación y construyes disciplina.',
  'Tu cuerpo puede soportar casi cualquier cosa. Es tu mente la que debes convencer.',
  'No tienes que ser el mejor. Solo tienes que ser mejor que ayer.',
  'El gym no te quita tiempo, te da energía para el resto del día.',
  'La constancia supera al talento cuando el talento no es constante.',
  'Cada rep es una conversación contigo mismo sobre quién quieres ser.',
  'El único mal entrenamiento es el que no hiciste.',
  'Nadie nunca salió del gym arrepintiéndose de haber ido.',
  'Pequeños avances cada día resultan en grandes cambios.',
  'La rutina de hoy es el resultado de mañana.',
  'No esperes sentirte motivado. Empieza, la motivación llega después.',
  'El gym es el único lugar donde el dolor que causas se llama progreso.',
  'Tu excusa más frecuente es tu mayor enemigo.',
  'Los campeones no nacen en torneos, nacen en los entrenamientos.',
  'Si pudieras hacerlo fácil, ya lo habrías hecho. El esfuerzo es el punto.',
  'Cuida tu cuerpo, es el único lugar que tienes para vivir.',
  'La fuerza no viene de lo que puedes hacer. Viene de superar lo que creías que no podías.',
  'El progreso no es lineal, pero siempre es acumulativo.',
  'Hoy puede que no sea tu mejor día, pero sí puede ser el de alguien que entrena igual que tú.',
  'No busques la rutina perfecta. Busca la consistencia imperfecta.',
  'Un paso más que ayer ya es victoria.',
  'La mente se rinde mil veces antes que el cuerpo.',
  'Entrena como si alguien en algún lugar siempre estuviera haciéndolo.',
  'El gym no distingue entre estados de ánimo. Solo entre presentes y ausentes.',
  'Si lo haces cuando no tienes ganas, lo harás siempre.',
  'El músculo no crece durante el entreno. Crece mientras descansas. Pero sin el entreno, no hay nada.',
  'Cinco minutos de movimiento vencen a cero minutos de perfección.',
  'La diferencia entre un sueño y una meta es un plan y trabajo.',
  'Cada entrenamiento es un depósito en tu cuenta de salud.',
  'No importa lo lento que vayas, siempre irás más rápido que quien está en el sillón.',
]

const HITOS_RACHA = [
  { min: 52, msg: '¡Un año entero! Leyenda absoluta.' },
  { min: 20, msg: '¡Increíble! Pocos llegan hasta acá.' },
  { min: 12, msg: '¡3 meses seguidos! Eres una máquina.' },
  { min: 8,  msg: '¡2 meses seguidos! Nivel élite.' },
  { min: 6,  msg: '¡6 semanas! Ya es un hábito real.' },
  { min: 4,  msg: '¡Un mes de consistencia! Sigue así.' },
  { min: 2,  msg: '¡Dos semanas seguidas! Vas bien.' },
  { min: 1,  msg: '¡Arrancaste! La racha comienza.' },
]

function getFraseDelDia() {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), 0, 0)
  const dia = Math.floor((ahora - inicio) / 86400000)
  return FRASES_DIA[dia % FRASES_DIA.length]
}

function getMensajeHito(semanas) {
  const hito = HITOS_RACHA.find(h => semanas >= h.min)
  return hito ? hito.msg : null
}

// ── Tarjeta de racha ─────────────────────────────────────────────────────

function TarjetaRacha({ user, onUserUpdate }) {
  const [rachaSheet, setRachaSheet] = useState(false)
  const [sesionesEstaSemana, setSesionesEstaSemana] = useState(0)

  useEffect(() => {
    getAllWorkouts().then(todos => {
      const lunes = getLunes(new Date())
      const n = todos.filter(w => w.fechaFin && new Date(w.fechaFin) >= lunes).length
      setSesionesEstaSemana(n)
    })
  }, [])

  const modaRacha = user?.modaRacha ?? false
  const rachaSemanas = user?.rachaSemanas ?? 0
  const rachaMejor = user?.rachaMejor ?? 0
  const pases = user?.pases ?? 0
  const metaSemanal = user?.metaSemanal ?? 3

  async function toggleRacha() {
    const updated = { ...user, modaRacha: !modaRacha }
    await saveUser(updated)
    onUserUpdate(updated)
  }

  async function cambiarMeta(delta) {
    const nueva = Math.min(7, Math.max(1, metaSemanal + delta))
    const updated = { ...user, metaSemanal: nueva }
    await saveUser(updated)
    onUserUpdate(updated)
  }

  if (!modaRacha) {
    return (
      <div className="px-4 mt-4">
        <button
          onClick={() => setRachaSheet(true)}
          className="w-full bg-[#1C1C1E] py-3.5 rounded-2xl flex items-center justify-center gap-2 active:opacity-70"
        >
          <svg viewBox="0 0 24 24" fill="#FF9500" width="18" height="18">
            <path d="M12 2c0 0-6 5.5-6 10a6 6 0 0 0 12 0c0-4.5-6-10-6-10zm0 14a2 2 0 0 1-2-2c0-2 2-5 2-5s2 3 2 5a2 2 0 0 1-2 2z"/>
          </svg>
          <span className="text-[#FF9500] font-semibold text-sm">Activar modo racha</span>
        </button>

        {rachaSheet && <RachaSheet user={user} onUserUpdate={onUserUpdate} onCerrar={() => setRachaSheet(false)}
          sesionesEstaSemana={sesionesEstaSemana} toggleRacha={toggleRacha} cambiarMeta={cambiarMeta} />}
      </div>
    )
  }

  return (
    <div className="px-4 mt-4">
      <button
        onClick={() => setRachaSheet(true)}
        className="w-full bg-[#1C1C1E] rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-80"
      >
        <svg viewBox="0 0 24 24" fill="#FF9500" width="28" height="28">
          <path d="M12 2c0 0-6 5.5-6 10a6 6 0 0 0 12 0c0-4.5-6-10-6-10zm0 14a2 2 0 0 1-2-2c0-2 2-5 2-5s2 3 2 5a2 2 0 0 1-2 2z"/>
        </svg>
        <div className="flex-1 text-left">
          <p className="text-white font-bold text-base leading-tight">
            {rachaSemanas === 0 ? 'Sin racha aún' : `${rachaSemanas} semana${rachaSemanas !== 1 ? 's' : ''} en racha`}
          </p>
          <p className="text-[#8E8E93] text-xs mt-0.5">
            {sesionesEstaSemana}/{metaSemanal} esta semana
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {Array.from({ length: metaSemanal }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: i < sesionesEstaSemana ? '#30D158' : '#3A3A3C' }}
            />
          ))}
        </div>
      </button>

      {rachaSheet && <RachaSheet user={user} onUserUpdate={onUserUpdate} onCerrar={() => setRachaSheet(false)}
        sesionesEstaSemana={sesionesEstaSemana} toggleRacha={toggleRacha} cambiarMeta={cambiarMeta} />}
    </div>
  )
}

function RachaSheet({ user, onUserUpdate, onCerrar, sesionesEstaSemana, toggleRacha, cambiarMeta }) {
  const rachaSemanas = user?.rachaSemanas ?? 0
  const rachaMejor = user?.rachaMejor ?? 0
  const pases = user?.pases ?? 0
  const metaSemanal = user?.metaSemanal ?? 3
  const modaRacha = user?.modaRacha ?? false

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/70"
        style={{ backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', cursor: 'pointer' }}
        onClick={onCerrar}
        onTouchEnd={e => { e.preventDefault(); onCerrar() }}
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-50 bg-[#1C1C1E] rounded-t-3xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'sheetUp 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle + cerrar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <div className="w-8" />
          <div className="w-12 h-1.5 bg-[#48484A] rounded-full" />
          <button onClick={onCerrar} className="w-8 h-8 bg-[#3A3A3C] rounded-full flex items-center justify-center active:opacity-60">
            <svg viewBox="0 0 24 24" fill="none" stroke="#EBEBF5" strokeWidth="2.5" strokeLinecap="round" width="13" height="13">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 pb-8 pt-3">
          {/* Header racha */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" fill="#FF9500" width="40" height="40">
              <path d="M12 2c0 0-6 5.5-6 10a6 6 0 0 0 12 0c0-4.5-6-10-6-10zm0 14a2 2 0 0 1-2-2c0-2 2-5 2-5s2 3 2 5a2 2 0 0 1-2 2z"/>
            </svg>
            <div>
              <p className="text-white font-bold text-[28px] leading-tight">{rachaSemanas}</p>
              <p className="text-[#8E8E93] text-sm">semanas consecutivas</p>
            </div>
            {rachaMejor > 0 && (
              <div className="ml-auto text-right">
                <p className="text-[#FF9500] font-semibold text-lg">{rachaMejor}</p>
                <p className="text-[#8E8E93] text-xs">mejor racha</p>
              </div>
            )}
          </div>
          {rachaSemanas >= 1 && getMensajeHito(rachaSemanas) && (
            <p className="text-[#30D158] text-sm font-medium text-center mt-2 mb-4">
              {getMensajeHito(rachaSemanas)}
            </p>
          )}
          {rachaSemanas === 0 && <div className="mb-4" />}

          {/* Progreso semana actual */}
          <div className="bg-[#2C2C2E] rounded-2xl p-4 mb-4">
            <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2">Esta semana</p>
            <div className="flex gap-1.5">
              {Array.from({ length: metaSemanal }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-2 rounded-full"
                  style={{ backgroundColor: i < sesionesEstaSemana ? '#30D158' : '#48484A' }}
                />
              ))}
            </div>
            <p className="text-white font-semibold text-sm mt-2">{sesionesEstaSemana} de {metaSemanal} sesiones</p>
          </div>

          {/* Meta semanal */}
          <div className="bg-[#2C2C2E] rounded-2xl p-4 mb-4">
            <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-3">Meta semanal</p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => cambiarMeta(-1)}
                className="w-10 h-10 bg-[#3A3A3C] rounded-full flex items-center justify-center text-white text-xl font-bold active:opacity-60"
              >−</button>
              <p className="text-white font-bold text-2xl">{metaSemanal} día{metaSemanal !== 1 ? 's' : ''}</p>
              <button
                onClick={() => cambiarMeta(1)}
                className="w-10 h-10 bg-[#3A3A3C] rounded-full flex items-center justify-center text-white text-xl font-bold active:opacity-60"
              >+</button>
            </div>
          </div>

          {/* Pases */}
          <div className="bg-[#2C2C2E] rounded-2xl p-4 mb-5">
            <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2">Pases disponibles</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: '#FF9500', backgroundColor: i < pases ? '#FF9500' : 'transparent' }}
                  >
                    {i < pases && (
                      <svg viewBox="0 0 24 24" fill="white" width="14" height="14">
                        <path d="M12 2c0 0-6 5.5-6 10a6 6 0 0 0 12 0c0-4.5-6-10-6-10zm0 14a2 2 0 0 1-2-2c0-2 2-5 2-5s2 3 2 5a2 2 0 0 1-2 2z"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[#8E8E93] text-xs flex-1">Ganas 1 pase cada 4 semanas en racha. Máx. 2. Se usan automáticamente si no cumples tu meta.</p>
            </div>
          </div>

          {/* Botón activar/pausar */}
          <button
            onClick={async () => { await toggleRacha(); onCerrar() }}
            className="w-full py-4 rounded-2xl font-bold text-base active:opacity-80"
            style={{ backgroundColor: modaRacha ? '#2C2C2E' : '#30D158', color: modaRacha ? '#FF3B30' : '#000' }}
          >
            {modaRacha ? 'Pausar modo racha' : 'Activar modo racha'}
          </button>
        </div>
      </div>

    </>
  )
}

// ── Pantalla principal Entrenar ───────────────────────────────────────────

export default function Entrenar({ onIniciar, user, onUserUpdate }) {
  const [recientes, setRecientes] = useState(null)
  const [plantillas, setPlantillas] = useState(null)
  const [creando, setCreando] = useState(false)
  const [plantillaSheet, setPlantillaSheet] = useState(null)
  const [editandoPlantilla, setEditandoPlantilla] = useState(null)
  const longPressTimerRef = useRef(null)

  useEffect(() => {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const [todos, templates] = await Promise.all([getAllWorkouts(), getAllTemplates()])

    const completados = todos.filter(w => w.fechaFin)
      .sort((a, b) => new Date(b.fechaFin) - new Date(a.fechaFin))
      .slice(0, 3)

    const enriquecidos = await Promise.all(completados.map(async w => {
      const wes = await getWorkoutExercises(w.id)
      const nombres = await Promise.all(wes.slice(0, 3).map(we => getExercise(we.exerciseId).then(e => e?.nombre ?? '')))
      return { ...w, ejercicios: nombres.filter(Boolean), total: wes.length }
    }))
    setRecientes(enriquecidos)

    const enriquecidas = await Promise.all(templates.map(async t => {
      const tes = await getTemplateExercises(t.id)
      const nombres = await Promise.all(tes.slice(0, 3).map(te => getExercise(te.exerciseId).then(e => e?.nombre ?? '')))
      return { ...t, ejercicios: nombres.filter(Boolean), total: tes.length }
    }))
    setPlantillas(enriquecidas)
  }

  async function handleEliminarPlantilla(id) {
    await deleteTemplate(id)
    cargarTodo()
  }

  function iniciarLongPress(plantilla) {
    clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      navigator.vibrate?.(40)
      setPlantillaSheet(plantilla)
    }, 500)
  }

  function cancelarLongPress() {
    clearTimeout(longPressTimerRef.current)
  }

  if (creando) {
    return (
      <CrearPlantilla
        onGuardar={() => { setCreando(false); cargarTodo() }}
        onCancelar={() => setCreando(false)}
      />
    )
  }

  if (editandoPlantilla) {
    return (
      <EditarPlantilla
        plantilla={editandoPlantilla}
        onGuardar={() => { setEditandoPlantilla(null); cargarTodo() }}
        onCancelar={() => setEditandoPlantilla(null)}
      />
    )
  }

  return (
    <div className="pb-8">

      <div className="px-4 pt-5 pb-2">
        <h1 className="text-[34px] font-bold tracking-tight">
          Hola, {(user?.nombre || 'campeón').split(' ')[0]} 👋
        </h1>
        {recientes !== null && mensajeAusencia(recientes) && (
          <p className="text-[#636366] text-[15px] mt-0.5">
            {mensajeAusencia(recientes)}
          </p>
        )}
      </div>

      {/* Racha */}
      {user && onUserUpdate && (
        <TarjetaRacha user={user} onUserUpdate={onUserUpdate} />
      )}

      {/* Botón principal */}
      <div className="px-4 mt-4">
        <button
          onClick={() => onIniciar()}
          className="w-full bg-[#30D158] text-black font-semibold text-lg py-4 rounded-2xl active:scale-[0.98] transition-transform"
        >
          Empezar entrenamiento
        </button>
        <p className="text-[#636366] text-[13px] italic text-center leading-snug mt-3 px-2">
          &ldquo;{getFraseDelDia()}&rdquo;
        </p>
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
                onClick={() => setPlantillaSheet(p)}
                onTouchStart={() => iniciarLongPress(p)}
                onTouchEnd={cancelarLongPress}
                onTouchMove={cancelarLongPress}
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

      {/* PlantillaSheet */}
      {plantillaSheet && (
        <PlantillaSheet
          plantilla={plantillaSheet}
          onCerrar={() => setPlantillaSheet(null)}
          onIniciar={onIniciar}
          onEditar={() => { setPlantillaSheet(null); setEditandoPlantilla(plantillaSheet) }}
          onEliminar={async () => {
            await handleEliminarPlantilla(plantillaSheet.id)
            setPlantillaSheet(null)
          }}
        />
      )}

    </div>
  )
}
