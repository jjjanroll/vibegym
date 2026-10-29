import { useState, useEffect, useRef } from 'react'
import { saveWorkout, saveWorkoutExercise, saveSet, deleteSet, deleteWorkoutExercise, deleteWorkoutCompleto, getLastSetsForExercise, getUser, getWorkoutExercises, getExercise, getSets, getWorkout, getPRForExercise } from '../db'
import DumbbellIcon from '../components/DumbbellIcon'
import SelectorEjercicios from './SelectorEjercicios'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import NumericKeyboard from '../components/NumericKeyboard'

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

function formatAnterior(peso, reps, unidad = 'kg') {
  if (!peso && !reps) return '—'
  const pd = peso && unidad === 'lb' ? +(peso * 2.205).toFixed(1) : peso
  if (peso && reps) return `${pd}${unidad} × ${reps}`
  if (peso) return `${pd}${unidad}`
  return `× ${reps}`
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
  const [longPressSet, setLongPressSet] = useState(null) // { iIdx, sIdx } | null
  const [longPressEj, setLongPressEj] = useState(null)   // iIdx | null
  const [detalleEj, setDetalleEj] = useState(null) // ejercicio completo para el sheet
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const [confirmarTerminar, setConfirmarTerminar] = useState(false)
  const [campoActivo, setCampoActivo] = useState(null) // { iIdx, sIdx, campo } | null
  const [prBanner, setPrBanner] = useState(null) // { nombre, peso, reps } | null
  const [nombreWorkout, setNombreWorkout] = useState('')
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [newSetId, setNewSetId] = useState(null)
  const [unidad, setUnidad] = useState('kg')
  const inicioRef = useRef(Date.now())
  const longPressTimerRef = useRef(null)
  const longPressEjTimerRef = useRef(null)
  const dismissTimerRef = useRef(null)

  // Cargar estado existente (resume o desde plantilla)
  useEffect(() => {
    async function cargar() {
      const [user, wes, workout] = await Promise.all([
        getUser(),
        getWorkoutExercises(workoutId),
        getWorkout(workoutId),
      ])
      const unitActual = user?.unidad ?? 'kg'
      setUnidad(unitActual)
      if (user?.timerSegundos) setTimerDefault(user.timerSegundos)
      if (workout?.fechaInicio) {
        const elapsed = Math.floor((Date.now() - new Date(workout.fechaInicio)) / 1000)
        inicioRef.current = Date.now() - elapsed * 1000
      }
      if (workout?.nombre) {
        setNombreWorkout(workout.nombre)
      } else if (workout?.fechaInicio) {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        setNombreWorkout(`Entrenamiento del ${dias[new Date(workout.fechaInicio).getDay()]}`)
      }
      if (wes.length === 0) return

      const loaded = await Promise.all(wes.sort((a,b) => a.orden - b.orden).map(async we => {
        const [ejercicio, sets] = await Promise.all([
          getExercise(we.exerciseId),
          getSets(we.id),
        ])
        return {
          weId: we.id,
          ejercicioId: we.exerciseId,
          nombre: ejercicio?.nombre ?? '?',
          tipo: ejercicio?.tipo ?? 'fuerza',
          notas: we.notas ?? '',
          sets: sets.length > 0
            ? sets.map(s => ({
                id: s.id, orden: s.orden,
                peso: s.peso != null ? (unitActual === 'lb' ? +(s.peso * 2.205).toFixed(1) : s.peso) : '',
                reps: s.reps ?? '',
                tiempo: s.tiempo ?? '', distancia: s.distancia ?? '',
                completada: s.completada,
              }))
            : [{ id: null, orden: 1, peso: '', reps: '', tiempo: '', distancia: '', completada: false }],
        }
      }))

      const ants = {}
      await Promise.all(loaded.map(async item => {
        ants[item.ejercicioId] = await getLastSetsForExercise(item.ejercicioId, workoutId)
      }))

      setAnteriores(ants)
      setItems(loaded)
    }
    cargar()
  }, [workoutId])

  // Cronómetro del entrenamiento
  useEffect(() => {
    const t = setInterval(
      () => setSegundos(Math.floor((Date.now() - inicioRef.current) / 1000)),
      1000
    )
    return () => clearInterval(t)
  }, [])

  // Auto-scroll al campo activo
  useEffect(() => {
    if (!campoActivo) return
    const id = `kf-${campoActivo.iIdx}-${campoActivo.sIdx}-${campoActivo.campo}`
    const el = document.getElementById(id)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }, [campoActivo])

  // Cleanup de timeouts al desmontar
  useEffect(() => {
    return () => {
      clearTimeout(longPressTimerRef.current)
      clearTimeout(longPressEjTimerRef.current)
      clearTimeout(dismissTimerRef.current)
    }
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
    setNewSetId(setId)
    setTimeout(() => setNewSetId(null), 400)
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

  function iniciarLongPress(iIdx, sIdx) {
    clearTimeout(longPressTimerRef.current)
    clearTimeout(dismissTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      navigator.vibrate?.(40)
      setLongPressSet({ iIdx, sIdx })
      // Auto-dismiss a los 3 segundos si no se confirma
      dismissTimerRef.current = setTimeout(() => setLongPressSet(null), 3000)
    }, 500)
  }

  function cancelarLongPress() {
    clearTimeout(longPressTimerRef.current)
  }

  function confirmarEliminar(iIdx, sIdx) {
    clearTimeout(dismissTimerRef.current)
    setLongPressSet(null)
    navigator.vibrate?.([15, 10, 15])
    eliminarSerie(iIdx, sIdx)
  }

  function iniciarLongPressEj(iIdx) {
    clearTimeout(longPressEjTimerRef.current)
    longPressEjTimerRef.current = setTimeout(() => {
      navigator.vibrate?.(40)
      setLongPressEj(iIdx)
    }, 500)
  }

  function cancelarLongPressEj() {
    clearTimeout(longPressEjTimerRef.current)
  }

  async function eliminarEjercicio(iIdx) {
    const item = items[iIdx]
    await deleteWorkoutExercise(item.weId)
    if (timer?.exerciseIdx === iIdx) setTimer(null)
    setLongPressEj(null)
    setItems(prev => prev.filter((_, i) => i !== iIdx))
  }

  async function moverEjercicio(iIdx, direccion) {
    const nuevoIdx = iIdx + direccion
    if (nuevoIdx < 0 || nuevoIdx >= items.length) return
    const newItems = [...items]
    const [removed] = newItems.splice(iIdx, 1)
    newItems.splice(nuevoIdx, 0, removed)
    await Promise.all(newItems.map((item, idx) =>
      saveWorkoutExercise({
        id: item.weId,
        workoutId,
        exerciseId: item.ejercicioId,
        orden: idx,
        notas: item.notas,
      })
    ))
    setItems(newItems)
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

  function getCampoValor(iIdx, sIdx, campo) {
    return String(items[iIdx]?.sets[sIdx]?.[campo] ?? '')
  }

  function handleDigit(d) {
    if (!campoActivo) return
    const { iIdx, sIdx, campo } = campoActivo
    const cur = getCampoValor(iIdx, sIdx, campo)
    const nuevo = (cur === '0' || cur === '') ? d : cur + d
    actualizarValor(iIdx, sIdx, campo, nuevo)
  }

  function handleBackspace() {
    if (!campoActivo) return
    const { iIdx, sIdx, campo } = campoActivo
    const cur = getCampoValor(iIdx, sIdx, campo)
    actualizarValor(iIdx, sIdx, campo, cur.slice(0, -1))
  }

  function handleDecimal() {
    if (!campoActivo) return
    const { iIdx, sIdx, campo } = campoActivo
    const cur = getCampoValor(iIdx, sIdx, campo)
    if (cur.includes('.')) return
    actualizarValor(iIdx, sIdx, campo, (cur || '0') + '.')
  }

  function handleIncrement(delta) {
    if (!campoActivo) return
    const { iIdx, sIdx, campo } = campoActivo
    const curStr = getCampoValor(iIdx, sIdx, campo)
    let base
    if (curStr === '' || curStr === '0') {
      const prevSets = anteriores[items[iIdx]?.ejercicioId] ?? []
      const prev = prevSets[sIdx]
      if (campo === 'peso' && prev?.peso) {
        base = toDisplay(prev.peso)
      } else if (campo === 'reps' && prev?.reps) {
        base = prev.reps
      } else if (campo === 'tiempo' && prev?.tiempo) {
        base = prev.tiempo
      } else if (campo === 'distancia' && prev?.distancia) {
        base = prev.distancia
      } else {
        base = 0
      }
    } else {
      base = parseFloat(curStr) || 0
    }
    const nuevo = Math.max(0, +(+base + delta).toFixed(2))
    actualizarValor(iIdx, sIdx, campo, String(nuevo))
  }

  async function handleNext() {
    if (!campoActivo) return
    const { iIdx, sIdx, campo } = campoActivo
    await guardarAlSalir(iIdx, sIdx)

    const item = items[iIdx]
    const esCardio = item.tipo === 'cardio'
    const campo1 = esCardio ? 'tiempo' : 'peso'
    const campo2 = esCardio ? 'distancia' : 'reps'

    if (campo === campo1) {
      setCampoActivo({ iIdx, sIdx, campo: campo2 })
    } else if (sIdx + 1 < item.sets.length) {
      setCampoActivo({ iIdx, sIdx: sIdx + 1, campo: campo1 })
    } else if (iIdx + 1 < items.length) {
      setCampoActivo({ iIdx: iIdx + 1, sIdx: 0, campo: campo1 })
    } else {
      setCampoActivo(null)
    }
  }

  async function handleDismiss() {
    if (!campoActivo) return
    await guardarAlSalir(campoActivo.iIdx, campoActivo.sIdx)
    setCampoActivo(null)
  }

  function activarCampo(iIdx, sIdx, campo) {
    if (campoActivo && (campoActivo.iIdx !== iIdx || campoActivo.sIdx !== sIdx)) {
      guardarAlSalir(campoActivo.iIdx, campoActivo.sIdx)
    }
    setCampoActivo({ iIdx, sIdx, campo })
  }

  async function toggleSerie(iIdx, sIdx) {
    if (campoActivo?.iIdx === iIdx) {
      await guardarAlSalir(iIdx, sIdx)
      setCampoActivo(null)
    }
    const item = items[iIdx]
    const set = item.sets[sIdx]
    const completada = !set.completada

    let prAnterior = null
    if (completada && item.tipo !== 'cardio' && set.peso && set.reps) {
      prAnterior = await getPRForExercise(item.ejercicioId)
    }

    await saveSet({
      id:                set.id,
      workoutExerciseId: item.weId,
      orden:             set.orden,
      peso:              toKg(set.peso) || null,
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
      navigator.vibrate?.([30])
      setTimer({ exerciseIdx: iIdx, setIdx: sIdx, segundos: timerDefault })

      if (item.tipo !== 'cardio' && set.peso && set.reps) {
        const pesoKg = toKg(set.peso)
        const repsN = parseInt(set.reps)
        if (pesoKg && repsN) {
          const rm1 = pesoKg * (1 + repsN / 30)
          if (rm1 > 0 && (!prAnterior || rm1 > prAnterior.rm1 * 1.001)) {
            setPrBanner({ nombre: item.nombre, peso: set.peso, reps: set.reps })
            navigator.vibrate?.([100, 50, 100, 50, 200])
            setTimeout(() => setPrBanner(null), 4000)
          }
        }
      }
    } else {
      // Si se desmarca la serie del ejercicio con timer activo y no quedan completadas → cerrar timer
      if (timer?.exerciseIdx === iIdx) {
        const restantes = items[iIdx].sets.filter((s, j) => j !== sIdx ? s.completada : false)
        if (restantes.length === 0) setTimer(null)
      }
    }
  }

  async function guardarNombreWorkout() {
    setEditandoNombre(false)
    const w = await getWorkout(workoutId)
    if (w) await saveWorkout({ ...w, nombre: nombreWorkout || w.nombre })
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
      peso:              esCardio ? null : (toKg(set.peso) || null),
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

  const toDisplay = (kg) => {
    if (kg == null || kg === '') return ''
    return unidad === 'lb' ? +(kg * 2.205).toFixed(1) : kg
  }
  const toKg = (val) => {
    const n = parseFloat(val)
    if (!n) return null
    return unidad === 'lb' ? +(n / 2.205).toFixed(3) : n
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
    <>
    <div className="flex flex-col" style={{ height: '100%' }}>

      {/* ── Header ── */}
      <div className="shrink-0 bg-[#1C1C1E] border-b border-[#38383A]">
        <div className="flex items-center px-4 py-3">
          <button onClick={() => setConfirmarCancelar(true)} className="text-[#FF453A] font-medium text-base w-24 text-left">
            Cancelar
          </button>
          <div className="flex-1 text-center min-w-0">
            <p className="text-white font-bold text-xl tabular-nums">{formatTiempo(segundos)}</p>
            {editandoNombre ? (
              <input
                className="text-[#8E8E93] text-xs text-center bg-transparent outline-none w-full mt-0.5 px-2"
                value={nombreWorkout}
                onChange={e => setNombreWorkout(e.target.value)}
                onBlur={guardarNombreWorkout}
                autoFocus
              />
            ) : (
              <button
                onClick={() => setEditandoNombre(true)}
                className="text-[#8E8E93] text-xs mt-0.5 truncate max-w-full"
              >
                {nombreWorkout || 'Toca para nombrar'}
              </button>
            )}
            {seriesCompletadas > 0 && !editandoNombre && (
              <p className="text-[#8E8E93] text-xs">
                {seriesCompletadas} serie{seriesCompletadas !== 1 ? 's' : ''} ✓
              </p>
            )}
          </div>
          <button onClick={() => setConfirmarTerminar(true)} className="bg-[#30D158] text-black font-bold text-sm px-4 py-2 rounded-xl w-24 text-center active:opacity-80">
            Terminar
          </button>
        </div>
      </div>

      {/* ── Contenido scrollable ── */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: campoActivo ? '240px' : undefined }}>

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

              {/* Nombre + ⓘ + notas */}
              <div
                className={`px-4 pt-3 pb-2 border-b border-[#38383A] transition-colors ${longPressEj === iIdx ? 'bg-[#FF3B30]/15' : ''}`}
                onTouchStart={() => iniciarLongPressEj(iIdx)}
                onTouchEnd={cancelarLongPressEj}
                onTouchMove={cancelarLongPressEj}
                onContextMenu={e => { e.preventDefault(); setLongPressEj(iIdx) }}
              >
                {longPressEj === iIdx ? (
                  <div className="flex items-center gap-2 py-0.5">
                    <button
                      onClick={() => eliminarEjercicio(iIdx)}
                      className="flex-1 text-[#FF3B30] font-semibold text-base text-left"
                    >
                      Eliminar ejercicio
                    </button>
                    <button
                      onClick={() => setLongPressEj(null)}
                      className="shrink-0 w-7 h-7 rounded-full bg-[#2C2C2E] flex items-center justify-center active:opacity-70"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.5"
                           strokeLinecap="round" width="12" height="12">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => getExercise(item.ejercicioId).then(setDetalleEj)}
                        className="flex-1 min-w-0 text-left active:opacity-70"
                      >
                        <p className="text-[#30D158] font-semibold text-base truncate">{item.nombre}</p>
                      </button>
                      {items.length > 1 && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => moverEjercicio(iIdx, -1)}
                            disabled={iIdx === 0}
                            className="w-6 h-6 bg-[#2C2C2E] rounded-lg flex items-center justify-center active:opacity-70 disabled:opacity-20"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.5" strokeLinecap="round" width="12" height="12">
                              <path d="M18 15l-6-6-6 6"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => moverEjercicio(iIdx, 1)}
                            disabled={iIdx === items.length - 1}
                            className="w-6 h-6 bg-[#2C2C2E] rounded-lg flex items-center justify-center active:opacity-70 disabled:opacity-20"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.5" strokeLinecap="round" width="12" height="12">
                              <path d="M6 9l6 6 6-6"/>
                            </svg>
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => getExercise(item.ejercicioId).then(setDetalleEj)}
                        className="shrink-0 w-7 h-7 rounded-full bg-[#2C2C2E] flex items-center justify-center active:opacity-70"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2"
                             strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5"/>
                          <line x1="12" y1="12" x2="12" y2="16"/>
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Notas del ejercicio..."
                      value={item.notas}
                      onChange={e => actualizarNotas(iIdx, e.target.value)}
                      onBlur={() => guardarNotasEjercicio(iIdx)}
                      className="text-[#8E8E93] text-sm bg-transparent w-full outline-none placeholder-[#3A3A3C] mt-1"
                    />
                  </>
                )}
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
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">+{unidad}</span>
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">Reps</span>
                  </>
                ) : (
                  <>
                    <span className="w-[52px] text-center text-[#8E8E93] text-xs font-medium shrink-0">{unidad}</span>
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
                  : formatAnterior(prev?.peso, prev?.reps, unidad)

                // Placeholders de los inputs
                const placeholder1 = esCardio
                  ? (prev?.tiempo ? String(prev.tiempo) : '—')
                  : (prev?.peso ? String(toDisplay(prev.peso)) : '—')
                const placeholder2 = esCardio
                  ? (prev?.distancia ? String(prev.distancia) : '—')
                  : (prev?.reps ? String(prev.reps) : '—')

                // Campos a leer/escribir
                const campo1 = esCardio ? 'tiempo' : 'peso'
                const campo2 = esCardio ? 'distancia' : 'reps'
                const valor1 = esCardio ? (set.tiempo ?? '') : set.peso
                const valor2 = esCardio ? (set.distancia ?? '') : set.reps

                const enModoEliminar = longPressSet?.iIdx === iIdx && longPressSet?.sIdx === sIdx

                return (
                  <div key={set.id} className={set.id === newSetId ? 'row-in' : ''}>
                    <div
                      className={`flex items-center px-3 py-2 gap-2 border-t border-[#38383A] transition-colors ${
                        enModoEliminar
                          ? 'bg-[#FF3B30]/15'
                          : set.completada ? 'bg-[#30D158]/10' : ''
                      }`}
                      onTouchStart={() => iniciarLongPress(iIdx, sIdx)}
                      onTouchEnd={cancelarLongPress}
                      onTouchMove={cancelarLongPress}
                      onMouseDown={() => iniciarLongPress(iIdx, sIdx)}
                      onMouseUp={cancelarLongPress}
                      onMouseLeave={cancelarLongPress}
                    >
                      <span className="w-5 text-center text-[#8E8E93] text-sm shrink-0">{sIdx + 1}</span>

                      <span className="flex-1 min-w-0 text-center text-[#8E8E93] text-sm truncate">
                        {anteriorText}
                      </span>

                      <button
                        id={`kf-${iIdx}-${sIdx}-${campo1}`}
                        onClick={() => activarCampo(iIdx, sIdx, campo1)}
                        className={`w-[52px] min-w-0 shrink-0 text-center rounded-xl py-2 text-sm font-medium transition-all ${
                          campoActivo?.iIdx === iIdx && campoActivo?.sIdx === sIdx && campoActivo?.campo === campo1
                            ? 'ring-2 ring-[#30D158] bg-[#1A3D27] text-white'
                            : set.completada
                              ? 'bg-[#30D158]/20 text-[#30D158] font-semibold'
                              : 'bg-[#2C2C2E] text-white'
                        }`}
                      >
                        {valor1 !== '' ? valor1 : <span className="text-[#3A3A3C] font-normal">{placeholder1}</span>}
                      </button>

                      <button
                        id={`kf-${iIdx}-${sIdx}-${campo2}`}
                        onClick={() => activarCampo(iIdx, sIdx, campo2)}
                        className={`w-[52px] min-w-0 shrink-0 text-center rounded-xl py-2 text-sm font-medium transition-all ${
                          campoActivo?.iIdx === iIdx && campoActivo?.sIdx === sIdx && campoActivo?.campo === campo2
                            ? 'ring-2 ring-[#30D158] bg-[#1A3D27] text-white'
                            : set.completada
                              ? 'bg-[#30D158]/20 text-[#30D158] font-semibold'
                              : 'bg-[#2C2C2E] text-white'
                        }`}
                      >
                        {valor2 !== '' ? valor2 : <span className="text-[#3A3A3C] font-normal">{placeholder2}</span>}
                      </button>

                      {enModoEliminar ? (
                        <button
                          onClick={() => confirmarEliminar(iIdx, sIdx)}
                          className="w-auto px-3 h-10 rounded-xl flex items-center gap-1.5 shrink-0 bg-[#FF3B30] active:opacity-80"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                               strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                          <span className="text-white font-bold text-xs">Eliminar</span>
                        </button>
                      ) : (
                        <button
                          key={`chk-${set.id}-${set.completada}`}
                          onClick={() => toggleSerie(iIdx, sIdx)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            set.completada
                              ? 'bg-[#30D158] check-pop'
                              : 'bg-[#1A3D27] border border-[#30D158] active:scale-95'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth="3"
                               stroke={set.completada ? '#000' : '#30D158'}
                               strokeLinecap="round" strokeLinejoin="round"
                               width="16" height="16">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Timer inline — aparece justo debajo de esta serie si fue la última completada */}
                    {timerEnEstaSerie && (
                      <div className="border-t border-[#30D158]/30 bg-[#0A1F10]">
                        <div className="flex items-center px-4 py-2.5 gap-3">
                          <div className="shrink-0">
                            <p className="text-[#8E8E93] text-[10px] uppercase tracking-wider leading-none mb-0.5">Descansando</p>
                            <p
                              className="font-bold text-xl tabular-nums leading-none"
                              style={
                                timer.segundos <= 10
                                  ? { color: '#FF9500', animation: 'timerPulse 1s ease-in-out infinite' }
                                  : { color: '#30D158' }
                              }
                            >
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

    {/* Sheet de detalle del ejercicio */}
    {detalleEj && (
      <ExerciseDetailSheet
        ejercicio={detalleEj}
        onCerrar={() => setDetalleEj(null)}
      />
    )}

    {/* Modal confirmación cancelar */}
    {confirmarCancelar && (
      <div className="fixed inset-0 z-50 flex items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div
          className="absolute inset-0 bg-black/60"
          style={{ cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setConfirmarCancelar(false)}
          onTouchEnd={e => { e.preventDefault(); setConfirmarCancelar(false) }}
        />
        <div className="relative w-full bg-[#1C1C1E] rounded-t-3xl px-6 pt-5 pb-6">
          <p className="text-white font-bold text-lg mb-1">¿Cancelar entrenamiento?</p>
          <p className="text-[#8E8E93] text-sm mb-5">Perderás todos los datos de esta sesión.</p>
          <button
            onClick={cancelar}
            className="w-full bg-[#FF3B30] text-white font-bold py-4 rounded-2xl mb-3 active:opacity-80"
          >
            Sí, cancelar
          </button>
          <button
            onClick={() => setConfirmarCancelar(false)}
            className="w-full bg-[#2C2C2E] text-white font-semibold py-4 rounded-2xl active:opacity-80"
          >
            Continuar entrenando
          </button>
        </div>
      </div>
    )}

    {/* Modal confirmación terminar */}
    {confirmarTerminar && (
      <div className="fixed inset-0 z-50 flex items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div
          className="absolute inset-0 bg-black/60"
          style={{ cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setConfirmarTerminar(false)}
          onTouchEnd={e => { e.preventDefault(); setConfirmarTerminar(false) }}
        />
        <div className="relative w-full bg-[#1C1C1E] rounded-t-3xl px-6 pt-5 pb-6">
          <p className="text-white font-bold text-lg mb-1">¿Terminar entrenamiento?</p>
          <p className="text-[#8E8E93] text-sm mb-5">
            {seriesCompletadas > 0
              ? `Tienes ${seriesCompletadas} serie${seriesCompletadas !== 1 ? 's' : ''} completada${seriesCompletadas !== 1 ? 's' : ''}.`
              : 'No tienes series completadas aún.'}
          </p>
          <button
            onClick={terminar}
            className="w-full bg-[#30D158] text-black font-bold py-4 rounded-2xl mb-3 active:opacity-80"
          >
            Sí, terminar
          </button>
          <button
            onClick={() => setConfirmarTerminar(false)}
            className="w-full bg-[#2C2C2E] text-white font-semibold py-4 rounded-2xl active:opacity-80"
          >
            Seguir entrenando
          </button>
        </div>
      </div>
    )}

    {prBanner && (
      <div
        className="fixed left-0 right-0 z-50 px-4"
        style={{ top: 'max(env(safe-area-inset-top), 16px)', cursor: 'pointer' }}
        onClick={() => setPrBanner(null)}
        onTouchEnd={e => { e.preventDefault(); setPrBanner(null) }}
      >
        <div className="bg-[#30D158] rounded-2xl px-5 py-4 flex items-center gap-3 shadow-xl">
          <span className="text-2xl">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="text-black font-bold text-base leading-tight">¡Nuevo récord personal!</p>
            <p className="text-black/70 text-sm truncate">{prBanner.nombre} · {prBanner.peso}{unidad} × {prBanner.reps} reps</p>
          </div>
        </div>
      </div>
    )}

    <NumericKeyboard
      campoActivo={campoActivo}
      items={items}
      onDigit={handleDigit}
      onDecimal={handleDecimal}
      onBackspace={handleBackspace}
      onIncrement={handleIncrement}
      onNext={handleNext}
      onDismiss={handleDismiss}
    />
    </>
  )
}
