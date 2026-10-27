import { useState, useEffect, useRef } from 'react'
import { saveWorkout, saveWorkoutExercise, saveSet, deleteSet, deleteWorkoutCompleto, getLastSetsForExercise, getUser } from '../db'
import DumbbellIcon from '../components/DumbbellIcon'
import SelectorEjercicios from './SelectorEjercicios'

const TIMER_DEFAULT_FALLBACK = 90

// ── Audio (Web Audio API) ─────────────────────────────────────────────────
// El contexto se crea y desbloquea en el primer gesto del usuario (checkmark).
let _audioCtx = null

function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return _audioCtx
}

function unlockAudio() {
  try { getAudioCtx().resume() } catch {}
}

function playDing() {
  try {
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    // Dos "pings" seguidos
    ;[0, 0.28].forEach(delay => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      const t = now + delay
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.45, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
      osc.start(t)
      osc.stop(t + 0.9)
    })
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatTiempo(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function formatAnterior(peso, reps) {
  if (!peso && !reps) return '—'
  if (peso && reps) return `${peso}kg × ${reps}`
  if (peso) return `${peso}kg`
  return `× ${reps}`
}

// ── SwipeableSetRow ───────────────────────────────────────────────────────
// Swipe izquierda → eliminar (rojo), swipe derecha → completar/descompletar (verde)

function SwipeableSetRow({ onDelete, onToggle, completada, children }) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const axis = useRef(null) // 'h' | 'v' | null — fijado en el primer movimiento

  const THRESHOLD = 76

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    axis.current = null
    setDragging(true)
  }

  function onTouchMove(e) {
    if (!dragging) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Fijar eje en el primer movimiento para no competir con scroll vertical
    if (axis.current === null) {
      if (Math.abs(dx) > Math.abs(dy) + 4) axis.current = 'h'
      else { axis.current = 'v'; return }
    }
    if (axis.current !== 'h') return

    e.preventDefault()
    // Limitar desplazamiento: izquierda hasta -120, derecha hasta +100
    setOffsetX(Math.max(-120, Math.min(100, dx)))
  }

  function onTouchEnd() {
    setDragging(false)
    if (axis.current !== 'h') return

    if (offsetX < -THRESHOLD) {
      // Animar fuera y luego eliminar
      setOffsetX(-500)
      setTimeout(onDelete, 220)
    } else if (offsetX > THRESHOLD) {
      onToggle()
      setOffsetX(0)
    } else {
      setOffsetX(0)
    }
  }

  const progress = Math.min(1, Math.abs(offsetX) / THRESHOLD)
  const showLeft = offsetX > 12    // revela fondo verde (completar)
  const showRight = offsetX < -12  // revela fondo rojo (eliminar)

  return (
    <div className="relative overflow-hidden">
      {/* Fondo izquierdo — completar (verde) */}
      <div
        className="absolute inset-y-0 left-0 w-full flex items-center px-5 bg-[#30D158]"
        style={{ opacity: showLeft ? Math.min(1, progress * 1.5) : 0 }}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="#000"
             strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span className="text-black font-bold text-sm ml-2">
          {completada ? 'Desmarcar' : 'Completar'}
        </span>
      </div>

      {/* Fondo derecho — eliminar (rojo) */}
      <div
        className="absolute inset-y-0 right-0 w-full flex items-center justify-end px-5 bg-[#FF3B30]"
        style={{ opacity: showRight ? Math.min(1, progress * 1.5) : 0 }}
      >
        <span className="text-white font-bold text-sm mr-2">Eliminar</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
             strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </div>

      {/* Fila deslizable */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease',
          willChange: 'transform',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// ── Componente ────────────────────────────────────────────────────────────

export default function WorkoutActivo({ workoutId, onTerminar, onCancelar }) {
  const [items, setItems] = useState([])
  const [anteriores, setAnteriores] = useState({})
  const [seleccionando, setSeleccionando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  // timer: null = inactivo | { exerciseIdx, setIdx, segundos }
  const [timer, setTimer] = useState(null)
  const [timerDefault, setTimerDefault] = useState(TIMER_DEFAULT_FALLBACK)
  const inicioRef = useRef(Date.now())

  // Leer timer configurado por el usuario
  useEffect(() => {
    getUser().then(u => { if (u?.timerSegundos) setTimerDefault(u.timerSegundos) })
  }, [])

  // Cronómetro del entrenamiento
  useEffect(() => {
    const t = setInterval(
      () => setSegundos(Math.floor((Date.now() - inicioRef.current) / 1000)),
      1000
    )
    return () => clearInterval(t)
  }, [])

  // Timer de descanso — un tick por segundo
  useEffect(() => {
    if (!timer) return
    if (timer.segundos <= 0) {
      playDing()
      navigator.vibrate?.([300, 100, 300])
      setTimer(null)
      return
    }
    const t = setTimeout(
      () => setTimer(prev => prev ? { ...prev, segundos: prev.segundos - 1 } : null),
      1000
    )
    return () => clearTimeout(t)
  }, [timer])

  async function agregarEjercicio(ejercicio) {
    setSeleccionando(false)
    const weId = await saveWorkoutExercise({
      workoutId,
      exerciseId: ejercicio.id,
      orden: items.length,
      notas: '',
    })
    const setId = await saveSet({
      workoutExerciseId: weId,
      orden: 1,
      peso: null,
      reps: null,
      completada: false,
      notas: null,
    })
    const prevSets = await getLastSetsForExercise(ejercicio.id, workoutId)
    setAnteriores(prev => ({ ...prev, [ejercicio.id]: prevSets }))
    setItems(prev => [...prev, {
      weId,
      ejercicioId: ejercicio.id,
      nombre: ejercicio.nombre,
      tipo: ejercicio.tipo ?? 'fuerza',
      notas: '',
      sets: [{ id: setId, orden: 1, peso: '', reps: '', tiempo: '', distancia: '', completada: false }],
    }])
  }

  async function agregarSerie(iIdx) {
    const item = items[iIdx]
    const ultima = item.sets[item.sets.length - 1]
    const esCardio = item.tipo === 'cardio'
    const setId = await saveSet({
      workoutExerciseId: item.weId,
      orden: item.sets.length + 1,
      peso: null, reps: null, tiempo: null, distancia: null,
      completada: false, notas: null,
    })
    setItems(prev => prev.map((it, i) => i !== iIdx ? it : {
      ...it,
      sets: [...it.sets, {
        id: setId,
        orden: it.sets.length + 1,
        peso:      esCardio ? '' : (ultima?.peso ?? ''),
        reps:      esCardio ? '' : (ultima?.reps ?? ''),
        tiempo:    esCardio ? (ultima?.tiempo ?? '') : '',
        distancia: esCardio ? (ultima?.distancia ?? '') : '',
        completada: false,
      }],
    }))
  }

  async function eliminarSerie(iIdx, sIdx) {
    const set = items[iIdx].sets[sIdx]
    await deleteSet(set.id)
    // Si el timer apunta a esta serie o a una posterior, cancelarlo
    if (timer?.exerciseIdx === iIdx && timer?.setIdx >= sIdx) setTimer(null)
    setItems(prev => prev.map((it, i) => i !== iIdx ? it : {
      ...it,
      sets: it.sets.filter((_, j) => j !== sIdx).map((s, j) => ({ ...s, orden: j + 1 })),
    }))
  }

  function actualizarValor(iIdx, sIdx, campo, valor) {
    setItems(prev => prev.map((it, i) => i !== iIdx ? it : {
      ...it,
      sets: it.sets.map((s, j) => j !== sIdx ? s : { ...s, [campo]: valor }),
    }))
  }

  function actualizarNotas(iIdx, valor) {
    setItems(prev => prev.map((it, i) => i !== iIdx ? it : { ...it, notas: valor }))
  }

  async function guardarNotasEjercicio(iIdx) {
    const item = items[iIdx]
    await saveWorkoutExercise({
      id: item.weId,
      workoutId,
      exerciseId: item.ejercicioId,
      orden: iIdx,
      notas: item.notas,
    })
  }

  async function toggleSerie(iIdx, sIdx) {
    const item = items[iIdx]
    const set = item.sets[sIdx]
    const completada = !set.completada
    await saveSet({
      id:                set.id,
      workoutExerciseId: item.weId,
      orden:             set.orden,
      peso:              parseFloat(set.peso) || null,
      reps:              parseInt(set.reps)   || null,
      completada,
      notas: null,
    })
    setItems(prev => prev.map((it, i) => i !== iIdx ? it : {
      ...it,
      sets: it.sets.map((s, j) => j !== sIdx ? s : { ...s, completada }),
    }))
    if (completada) {
      unlockAudio()
      // Mueve el timer al ejercicio y serie recién completada (reinicia si ya había uno)
      setTimer({ exerciseIdx: iIdx, setIdx: sIdx, segundos: timerDefault })
    } else {
      // Si se desmarca la serie del ejercicio con timer activo y no quedan completadas → cerrar timer
      if (timer?.exerciseIdx === iIdx) {
        const restantes = items[iIdx].sets.filter((s, j) => j !== sIdx ? s.completada : false)
        if (restantes.length === 0) setTimer(null)
      }
    }
  }

  async function guardarAlSalir(iIdx, sIdx) {
    const item = items[iIdx]
    const set = item.sets[sIdx]
    const esCardio = item.tipo === 'cardio'
    if (esCardio && set.tiempo === '' && set.distancia === '') return
    if (!esCardio && set.peso === '' && set.reps === '') return
    await saveSet({
      id:                set.id,
      workoutExerciseId: item.weId,
      orden:             set.orden,
      peso:              esCardio ? null : (parseFloat(set.peso) || null),
      reps:              esCardio ? null : (parseInt(set.reps)   || null),
      tiempo:            esCardio ? (parseFloat(set.tiempo) || null) : null,
      distancia:         esCardio ? (parseFloat(set.distancia) || null) : null,
      completada:        set.completada,
      notas: null,
    })
  }

  async function terminar() {
    await saveWorkout({ id: workoutId, fechaFin: new Date().toISOString() })
    onTerminar(workoutId)
  }

  async function cancelar() {
    await deleteWorkoutCompleto(workoutId)
    onCancelar()
  }

  const seriesCompletadas = items.reduce((n, it) => n + it.sets.filter(s => s.completada).length, 0)

  if (seleccionando) {
    return (
      <SelectorEjercicios
        onSeleccionar={agregarEjercicio}
        onCerrar={() => setSeleccionando(false)}
      />
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>

      {/* ── Header ── */}
      <div className="shrink-0 bg-[#1C1C1E] border-b border-[#38383A]">
        <div className="flex items-center px-4 py-3">
          <button onClick={cancelar} className="text-[#FF453A] font-medium text-base w-24 text-left">
            Cancelar
          </button>
          <div className="flex-1 text-center">
            <p className="text-white font-bold text-xl tabular-nums">{formatTiempo(segundos)}</p>
            {seriesCompletadas > 0 && (
              <p className="text-[#8E8E93] text-xs mt-0.5">
                {seriesCompletadas} serie{seriesCompletadas !== 1 ? 's' : ''} ✓
              </p>
            )}
          </div>
          <button onClick={terminar} className="bg-[#30D158] text-black font-bold text-sm px-4 py-2 rounded-xl w-24 text-center active:opacity-80">
            Terminar
          </button>
        </div>
      </div>

      {/* ── Contenido scrollable ── */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-20 h-20 bg-[#1C1C1E] rounded-full flex items-center justify-center mb-4">
              <DumbbellIcon size={36} color="#8E8E93" />
            </div>
            <p className="text-white font-semibold text-lg">Empieza tu entrenamiento</p>
            <p className="text-[#8E8E93] text-sm mt-1">Agrega tu primer ejercicio abajo</p>
          </div>
        )}

        {items.map((item, iIdx) => {
          const prevSets = anteriores[item.ejercicioId] ?? []
          const timerAqui = timer?.exerciseIdx === iIdx
          const esCardio = item.tipo === 'cardio'
          const esPesoCorp = item.tipo === 'peso_corporal'

          return (
            <div key={item.weId} className="mx-4 mt-4 bg-[#1C1C1E] rounded-2xl overflow-hidden">

              {/* Nombre + notas */}
              <div className="px-4 pt-3 pb-2 border-b border-[#38383A]">
                <p className="text-[#30D158] font-semibold text-base">{item.nombre}</p>
                <input
                  type="text"
                  placeholder="Notas del ejercicio..."
                  value={item.notas}
                  onChange={e => actualizarNotas(iIdx, e.target.value)}
                  onBlur={() => guardarNotasEjercicio(iIdx)}
                  className="text-[#8E8E93] text-sm bg-transparent w-full outline-none placeholder-[#3A3A3C] mt-1"
                />
              </div>

              {/* Cabecera columnas — varía según tipo */}
              <div className="flex items-center px-3 pt-2 pb-1 gap-2">
                <span className="w-5 text-center text-[#8E8E93] text-xs font-medium shrink-0">#</span>
                <span className="flex-1 min-w-0 text-center text-[#8E8E93] text-xs font-medium">Anterior</span>
                {esCardio ? (
                  <>
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">min</span>
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">km</span>
                  </>
                ) : esPesoCorp ? (
                  <>
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">+kg</span>
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">Reps</span>
                  </>
                ) : (
                  <>
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">kg</span>
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">Reps</span>
                  </>
                )}
                <span className="w-10 text-center text-[#8E8E93] text-xs font-medium shrink-0">✓</span>
              </div>

              {/* Series */}
              {item.sets.map((set, sIdx) => {
                const prev = prevSets[sIdx]
                const timerEnEstaSerie = timerAqui && timer.setIdx === sIdx

                // Texto "Anterior" según tipo
                const anteriorText = esCardio
                  ? (prev?.tiempo ? `${prev.tiempo}min` : '—')
                  : formatAnterior(prev?.peso, prev?.reps)

                // Placeholders de los inputs
                const placeholder1 = esCardio
                  ? (prev?.tiempo ? String(prev.tiempo) : '—')
                  : (prev?.peso ? String(prev.peso) : '—')
                const placeholder2 = esCardio
                  ? (prev?.distancia ? String(prev.distancia) : '—')
                  : (prev?.reps ? String(prev.reps) : '—')

                // Campos a leer/escribir
                const campo1 = esCardio ? 'tiempo' : 'peso'
                const campo2 = esCardio ? 'distancia' : 'reps'
                const valor1 = esCardio ? (set.tiempo ?? '') : set.peso
                const valor2 = esCardio ? (set.distancia ?? '') : set.reps

                return (
                  <div key={set.id}>
                    <SwipeableSetRow
                      completada={set.completada}
                      onToggle={() => toggleSerie(iIdx, sIdx)}
                      onDelete={() => eliminarSerie(iIdx, sIdx)}
                    >
                    <div
                      className={`flex items-center px-3 py-2 gap-2 border-t border-[#38383A] ${
                        set.completada ? 'bg-[#30D158]/10' : 'bg-[#1C1C1E]'
                      }`}
                    >
                      <span className="w-5 text-center text-[#8E8E93] text-sm shrink-0">{sIdx + 1}</span>

                      <span className="flex-1 min-w-0 text-center text-[#8E8E93] text-sm truncate">
                        {anteriorText}
                      </span>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={valor1}
                        onChange={e => actualizarValor(iIdx, sIdx, campo1, e.target.value)}
                        onBlur={() => guardarAlSalir(iIdx, sIdx)}
                        placeholder={placeholder1}
                        className={`w-[52px] min-w-0 shrink-0 text-center rounded-xl py-2 text-sm outline-none ${
                          set.completada
                            ? 'bg-[#30D158]/20 text-[#30D158] font-semibold'
                            : 'bg-[#2C2C2E] text-white placeholder-[#555]'
                        }`}
                      />

                      <input
                        type="text"
                        inputMode={esCardio ? 'decimal' : 'numeric'}
                        value={valor2}
                        onChange={e => actualizarValor(iIdx, sIdx, campo2, e.target.value)}
                        onBlur={() => guardarAlSalir(iIdx, sIdx)}
                        placeholder={placeholder2}
                        className={`w-[52px] min-w-0 shrink-0 text-center rounded-xl py-2 text-sm outline-none ${
                          set.completada
                            ? 'bg-[#30D158]/20 text-[#30D158] font-semibold'
                            : 'bg-[#2C2C2E] text-white placeholder-[#555]'
                        }`}
                      />

                      <button
                        onClick={() => toggleSerie(iIdx, sIdx)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-all ${
                          set.completada
                            ? 'bg-[#30D158]'
                            : 'bg-[#1A3D27] border border-[#30D158]'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="3"
                             stroke={set.completada ? '#000' : '#30D158'}
                             strokeLinecap="round" strokeLinejoin="round"
                             width="16" height="16">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    </div>
                    </SwipeableSetRow>

                    {/* Timer inline — aparece justo debajo de esta serie si fue la última completada */}
                    {timerEnEstaSerie && (
                      <div className="border-t border-[#30D158]/30 bg-[#0A1F10]">
                        <div className="flex items-center px-4 py-2.5 gap-3">
                          <div className="shrink-0">
                            <p className="text-[#8E8E93] text-[10px] uppercase tracking-wider leading-none mb-0.5">Descansando</p>
                            <p className="text-[#30D158] font-bold text-xl tabular-nums leading-none">
                              {String(Math.floor(timer.segundos / 60)).padStart(2, '0')}:{String(timer.segundos % 60).padStart(2, '0')}
                            </p>
                          </div>
                          <div className="flex-1" />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setTimer(t => t && { ...t, segundos: Math.max(0, t.segundos - 10) })}
                              className="text-[#8E8E93] text-xs bg-[#2C2C2E] px-2.5 py-1.5 rounded-lg active:opacity-70"
                            >
                              −10
                            </button>
                            <button
                              onClick={() => setTimer(null)}
                              className="text-black text-xs bg-[#30D158] px-3 py-1.5 rounded-lg font-semibold active:opacity-80"

                            >
                              Saltar
                            </button>
                            <button
                              onClick={() => setTimer(t => t && { ...t, segundos: t.segundos + 10 })}
                              className="text-[#8E8E93] text-xs bg-[#2C2C2E] px-2.5 py-1.5 rounded-lg active:opacity-70"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                        <div className="h-1 mx-4 mb-3 bg-[#2C2C2E] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#30D158] rounded-full"
                            style={{ width: `${(timer.segundos / timerDefault) * 100}%`, transition: 'width 1s linear' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                onClick={() => agregarSerie(iIdx)}
                className="w-full px-4 py-3.5 text-[#30D158] font-medium text-base text-center border-t border-[#38383A] active:bg-[#2C2C2E]"
              >
                + Agregar serie
              </button>
            </div>
          )
        })}

        <button
          onClick={() => setSeleccionando(true)}
          className="mx-4 mt-4 w-[calc(100%-2rem)] bg-[#1C1C1E] py-4 rounded-2xl text-[#30D158] font-semibold text-lg active:opacity-70"
        >
          + Agregar ejercicio
        </button>

        <div style={{ height: 'max(env(safe-area-inset-bottom), 24px)' }} />
      </div>
    </div>
  )
}
