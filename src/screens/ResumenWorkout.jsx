import { useState, useEffect, useRef } from 'react'
import { getWorkoutExercises, getSets, getExercise, getPRForExercise, getUser } from '../db'
import MuscleDiagram from '../components/MuscleDiagram'

const MENSAJES_POSTWORKOUT = [
  '¡Entrenamiento completado! Otro día que marcas la diferencia.',
  '¡Lo lograste! Cada rep cuenta.',
  '¡Sesión terminada! Tu yo del futuro te lo agradece.',
  'Trabajo hecho. Nadie te puede quitar lo que acabas de ganar.',
  '¡Brutal! Sigue así y los resultados llegarán.',
  '¡Bien hecho! La constancia construye cuerpos y carácter.',
  'Un entrenamiento más en el banco. Sigue sumando.',
  '¡Eso es! Hoy fuiste más fuerte que tus excusas.',
  'Completado. El descanso de hoy se lo ganaste.',
  '¡Crack! Otro ladrillo en la pared de tus metas.',
  'Terminaste cuando otros ni empezaron. Eso vale.',
  '¡Sesión lista! El músculo que no ves aún está creciendo.',
  'Otro día, otra victoria. Así se construye el hábito.',
  '¡Excelente trabajo! La disciplina que muestras hoy es el resultado de mañana.',
  'Hecho. Ahora a recuperar y volver con más.',
  '¡Tremendo! Cada entrenamiento te acerca más a tu mejor versión.',
  'Completado con éxito. El esfuerzo nunca miente.',
]

function getMensajePostWorkout(fechaFin) {
  const d = new Date(fechaFin || Date.now())
  const idx = (d.getDate() * 7 + d.getHours()) % MENSAJES_POSTWORKOUT.length
  return MENSAJES_POSTWORKOUT[idx]
}

function getMensajeDinamico(datos, fechaFin) {
  const n = datos.prsNuevos.length
  if (n >= 3) return `¡${n} récords personales en una sola sesión! Eso es historia. 🏆`
  if (n === 2) return `¡Dos récords personales hoy! Estás en otra liga. 🏆🏆`
  if (n === 1) return `¡Nuevo récord: ${datos.prsNuevos[0].nombre}! Sigue apretando. 🥇`
  if (datos.seriesTotal >= 30) return `¡${datos.seriesTotal} series completadas! Sesión brutal. 🔥`
  if (datos.seriesTotal >= 20) return `¡${datos.seriesTotal} series sin parar. Sin excusas. 💪`
  if (datos.volumenTotal >= 5000) return `¡${(datos.volumenTotal / 1000).toFixed(1)} toneladas movidas hoy! 🚀`
  return getMensajePostWorkout(fechaFin)
}

function getEquivalenciaVolumen(kg) {
  if (!kg || kg < 100) return null
  if (kg >= 5000) return `Es el peso de ${Math.round(kg / 4500)} elefante${kg >= 9000 ? 's' : ''} 🐘`
  if (kg >= 2000) return `Es el peso de un auto familiar 🚗`
  if (kg >= 1000) return `Más de 1 tonelada levantada 🏋️`
  if (kg >= 500) return `Más de media tonelada levantada 💪`
  return null
}

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

function dibujarSlideCanvas(s) {
  const W = 1080, H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H)
  bg.addColorStop(0, s.color1)
  bg.addColorStop(1, s.color2)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const glow = ctx.createRadialGradient(W / 2, H * 0.36, 0, W / 2, H * 0.36, W * 0.7)
  glow.addColorStop(0, s.accent + '44')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = s.accent
  ctx.font = 'bold 52px Arial, Helvetica, sans-serif'
  ctx.fillText('VibeGym', W / 2, 128)

  ctx.font = '180px serif'
  ctx.fillText(s.emoji, W / 2, H * 0.37)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 76px Arial, Helvetica, sans-serif'
  const words = s.titulo.split(' ')
  let line = '', lineY = H * 0.52
  for (const w of words) {
    const test = line + w + ' '
    if (ctx.measureText(test).width > W * 0.82 && line !== '') {
      ctx.fillText(line.trim(), W / 2, lineY)
      line = w + ' '; lineY += 94
    } else { line = test }
  }
  ctx.fillText(line.trim(), W / 2, lineY)

  ctx.fillStyle = 'rgba(255,255,255,0.52)'
  ctx.font = '46px Arial, Helvetica, sans-serif'
  ctx.fillText(s.subtitulo, W / 2, H * 0.7)

  ctx.fillStyle = s.accent
  ctx.font = 'bold 108px Arial, Helvetica, sans-serif'
  ctx.fillText(s.stat, W / 2, H * 0.81)

  if (s.statLabel) {
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.font = '46px Arial, Helvetica, sans-serif'
    ctx.fillText(s.statLabel, W / 2, H * 0.87)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.font = '38px Arial, Helvetica, sans-serif'
  ctx.fillText('vibegym.app', W / 2, H - 88)

  return canvas
}

function CompartirWrapped({ workout, datos, unidad = 'kg', onCerrar }) {
  const [slide, setSlide] = useState(0)
  const scrollRef = useRef(null)

  const duracion = formatDuracion(workout.fechaInicio, workout.fechaFin)
  const nombre = workout.nombre || 'Entrenamiento'
  const fecha = new Date(workout.fechaFin || Date.now()).toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const slides = [
    {
      color1: '#0A1F10', color2: '#0D2E18',
      accent: '#30D158',
      emoji: '💪',
      titulo: nombre,
      subtitulo: fecha,
      stat: duracion,
      statLabel: 'de sesión',
    },
    {
      color1: '#0D1A2E', color2: '#102040',
      accent: '#0A84FF',
      emoji: '🏋️',
      titulo: datos.volumenTotal > 0 ? formatVolumen(datos.volumenTotal) : '—',
      subtitulo: 'volumen levantado',
      stat: `${datos.seriesTotal} series`,
      statLabel: 'completadas',
    },
    ...(datos.prsNuevos.length > 0 ? [{
      color1: '#1F1200', color2: '#3A2200',
      accent: '#FF9500',
      emoji: '🏆',
      titulo: datos.prsNuevos.length === 1
        ? datos.prsNuevos[0].nombre
        : `${datos.prsNuevos.length} nuevos récords`,
      subtitulo: datos.prsNuevos.length === 1
        ? `${unidad === 'lb' ? +(datos.prsNuevos[0].peso * 2.205).toFixed(1) : datos.prsNuevos[0].peso}${unidad} × ${datos.prsNuevos[0].reps} reps`
        : datos.prsNuevos.map(p => p.nombre).join(' · '),
      stat: '¡Nuevo PR!',
      statLabel: '',
    }] : []),
    {
      color1: '#1A0A2E', color2: '#2A0D4A',
      accent: '#BF5AF2',
      emoji: '🎯',
      titulo: `${datos.ejercicios.length} ejercicio${datos.ejercicios.length !== 1 ? 's' : ''}`,
      subtitulo: datos.ejercicios.map(e => e.nombre).slice(0, 3).join(' · ') + (datos.ejercicios.length > 3 ? '...' : ''),
      stat: nombre,
      statLabel: 'completado 🔥',
    },
  ]

  function guardarImagen() {
    const s = slides[slide]
    const canvas = dibujarSlideCanvas(s)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'vibegym-sesion.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Mi sesión en VibeGym' })
          return
        } catch (e) {
          if (e.name === 'AbortError') return
        }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vibegym-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  function handleScroll(e) {
    const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth)
    setSlide(idx)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="shrink-0 flex items-center justify-between px-5 pb-3"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <button
          onClick={onCerrar}
          className="text-white/50 font-medium text-base active:opacity-70"
        >
          Cerrar
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === slide ? 20 : 8,
                height: 8,
                backgroundColor: i === slide ? slides[i].accent : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
        <button
          onClick={guardarImagen}
          className="text-white font-semibold text-base active:opacity-70"
        >
          Compartir ↑
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-scroll"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        onScroll={handleScroll}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            className="shrink-0 w-full h-full flex flex-col items-center justify-center px-8 text-center relative overflow-hidden"
            style={{
              scrollSnapAlign: 'start',
              background: `linear-gradient(135deg, ${s.color1} 0%, ${s.color2} 100%)`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 38%, ${s.accent}30 0%, transparent 68%)` }}
            />
            <p className="font-bold text-sm tracking-widest uppercase mb-8 relative z-10" style={{ color: s.accent }}>
              VibeGym
            </p>
            <p className="text-8xl mb-6 relative z-10">{s.emoji}</p>
            <p className="font-bold text-white leading-tight relative z-10 mb-2" style={{ fontSize: 30 }}>
              {s.titulo}
            </p>
            <p className="text-white/50 text-sm relative z-10 mb-10 px-4 leading-snug">
              {s.subtitulo}
            </p>
            <p className="font-bold relative z-10" style={{ fontSize: 52, color: s.accent }}>
              {s.stat}
            </p>
            {s.statLabel && (
              <p className="text-white/40 text-sm mt-1 relative z-10">{s.statLabel}</p>
            )}
            <p className="absolute bottom-6 text-white/20 text-xs">vibegym.app</p>
          </div>
        ))}
      </div>

      <p className="shrink-0 text-white/30 text-xs text-center py-2">
        Desliza para ver más · Toca Guardar para descargar
      </p>
    </div>
  )
}

export default function ResumenWorkout({ workout, onGuardar }) {
  const [datos, setDatos] = useState(null)
  const [mostrarWrapped, setMostrarWrapped] = useState(false)
  const [unidad, setUnidad] = useState('kg')

  useEffect(() => {
    async function cargar() {
      const [user, wes] = await Promise.all([getUser(), getWorkoutExercises(workout.id)])
      setUnidad(user?.unidad ?? 'kg')
      const ejercicios = []
      let volumenTotal = 0
      let seriesTotal = 0
      const prsNuevos = []
      const todosMusculosPrimarios = []
      const todosMusculosSecundarios = []

      for (const we of wes) {
        const ej = await getExercise(we.exerciseId)
        if (ej?.musculoPrincipal) todosMusculosPrimarios.push(ej.musculoPrincipal)
        if (ej?.musculosSecundarios?.length) todosMusculosSecundarios.push(...ej.musculosSecundarios)
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

      const musculosPrimUnicos = [...new Set(todosMusculosPrimarios)]
      const musculosSecUnicos = [...new Set(todosMusculosSecundarios)].filter(m => !musculosPrimUnicos.includes(m))
      setDatos({
        ejercicios, volumenTotal, seriesTotal, prsNuevos,
        musculoPrincipal: musculosPrimUnicos[0] ?? null,
        musculosSecundarios: [...musculosPrimUnicos.slice(1), ...musculosSecUnicos],
      })
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

        {/* Mensaje motivacional */}
        <div className="mx-4 mt-4 px-4 py-3 rounded-2xl" style={{ backgroundColor: '#30D15812' }}>
          <p className="text-[#30D158] text-sm font-medium text-center leading-snug">
            {datos ? getMensajeDinamico(datos, workout.fechaFin) : getMensajePostWorkout(workout.fechaFin)}
          </p>
        </div>

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

        {datos && getEquivalenciaVolumen(datos.volumenTotal) && (
          <p className="text-[#636366] text-xs text-center mt-2 px-4">
            {getEquivalenciaVolumen(datos.volumenTotal)}
          </p>
        )}

        {/* Diagrama muscular */}
        {datos?.musculoPrincipal && (
          <div className="mx-4 mt-4 bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#38383A]">
              <p className="text-white font-semibold">Músculos trabajados</p>
            </div>
            <div className="flex items-center justify-center py-4 px-6" style={{ height: 220 }}>
              <MuscleDiagram
                musculoPrincipal={datos.musculoPrincipal}
                musculosSecundarios={datos.musculosSecundarios ?? []}
              />
            </div>
          </div>
        )}

        {/* PRs nuevos */}
        {datos?.prsNuevos.length > 0 && (
          <div className="mx-4 mt-4 bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#38383A]">
              <p className="text-white font-semibold">🏆 Récords personales</p>
            </div>
            {datos.prsNuevos.map((pr, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-t border-[#38383A] first:border-t-0 bg-[#30D158]/10">
                <p className="text-[#30D158] font-medium text-sm">{pr.nombre}</p>
                <p className="text-[#30D158] text-sm font-bold">{unidad === 'lb' ? +(pr.peso * 2.205).toFixed(1) : pr.peso}{unidad} × {pr.reps}</p>
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
        <>
          <div className="shrink-0 px-4 pt-3 bg-black">
            <button
              onClick={() => setMostrarWrapped(true)}
              className="w-full bg-[#2C2C2E] text-white font-semibold text-base py-3.5 rounded-2xl active:opacity-70 flex items-center justify-center gap-2"
            >
              <span>🎉</span>
              <span>Compartir sesión</span>
            </button>
          </div>
          <GuardarPlantillaInline onGuardar={onGuardar} />
        </>
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
      {mostrarWrapped && datos && (
        <CompartirWrapped
          workout={workout}
          datos={datos}
          unidad={unidad}
          onCerrar={() => setMostrarWrapped(false)}
        />
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
