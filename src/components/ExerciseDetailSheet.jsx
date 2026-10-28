import { useState, useEffect } from 'react'
import { updateEjercicioGif } from '../db'
import EXERCISE_IMAGES from '../data/exercise-images'
import MuscleDiagram from './MuscleDiagram'

const CATEGORIA_COLOR = {
  'Pecho':    '#0A84FF',
  'Espalda':  '#FF6B35',
  'Hombros':  '#BF5AF2',
  'Bíceps':   '#30D158',
  'Tríceps':  '#32D74B',
  'Piernas':  '#FF9500',
  'Core':     '#FF2D55',
  'Cardio':   '#64D2FF',
}

export default function ExerciseDetailSheet({ ejercicio, onCerrar, onAgregar }) {
  const [imgUrls, setImgUrls] = useState([])
  const [img1Error, setImg1Error] = useState(false)
  const [img2Error, setImg2Error] = useState(false)
  const [vistaHero, setVistaHero] = useState('fotos')

  const color = CATEGORIA_COLOR[ejercicio?.categoria] ?? '#30D158'

  useEffect(() => {
    if (!ejercicio) return
    setImg1Error(false)
    setImg2Error(false)
    // Prioridad: gifUrl cacheado en DB → mapa estático
    let urls
    if (ejercicio.gifUrl) {
      urls = [ejercicio.gifUrl]
    } else {
      const raw = EXERCISE_IMAGES[ejercicio.id] ?? null
      urls = raw ? (Array.isArray(raw) ? raw : [raw]) : []
    }
    setImgUrls(urls)
    setVistaHero(urls.length > 0 ? 'fotos' : 'musculos')
    if (!ejercicio.gifUrl && urls.length > 0) {
      updateEjercicioGif(ejercicio.id, urls[0])
    }
  }, [ejercicio?.id])

  if (!ejercicio) return null

  const hasImg = imgUrls.length > 0 && !img1Error
  const hasTwoImgs = hasImg && imgUrls.length >= 2 && !img2Error

  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ejercicio.nombre + ' ejercicio técnica correcta')}`

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/70"
        style={{ backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
        onClick={onCerrar}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 bg-[#1C1C1E] rounded-t-3xl flex flex-col"
        style={{
          maxHeight: '90dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'sheetUp 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle bar + botón cerrar */}
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

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Nombre + chips */}
          <div className="px-5 pt-4 pb-3">
            <h2 className="text-white font-bold text-[22px] leading-tight">{ejercicio.nombre}</h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: color + '33', color }}
              >
                {ejercicio.categoria}
              </span>
              {ejercicio.musculoPrincipal && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#2C2C2E] text-[#AEAEB2]">
                  {ejercicio.musculoPrincipal}
                </span>
              )}
              {ejercicio.equipamiento && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#2C2C2E] text-[#8E8E93]">
                  {ejercicio.equipamiento}
                </span>
              )}
            </div>
          </div>

          {/* Tabs fotos/músculos — solo si hay imágenes */}
          {hasImg && (
            <div className="flex mx-4 mb-2 bg-[#2C2C2E] rounded-xl p-1 gap-1">
              <button
                onClick={() => setVistaHero('fotos')}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={vistaHero === 'fotos'
                  ? { backgroundColor: color + '22', color }
                  : { color: '#8E8E93' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" width="13" height="13">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                Fotos
              </button>
              <button
                onClick={() => setVistaHero('musculos')}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={vistaHero === 'musculos'
                  ? { backgroundColor: color + '22', color }
                  : { color: '#8E8E93' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" width="13" height="13">
                  <path d="M18 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/>
                  <path d="M6 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/>
                  <path d="M13 21v-1a4 4 0 0 0-4-4H5"/>
                  <path d="M11 21v-1a4 4 0 0 1 4-4h4"/>
                </svg>
                Músculos
              </button>
            </div>
          )}

          {/* Hero — imágenes o diagrama */}
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{
              height: 240,
              background: `linear-gradient(160deg, ${color}18 0%, ${color}08 100%)`,
              border: `1px solid ${color}20`,
            }}
          >
            {vistaHero === 'musculos' ? (
              <div className="flex items-center justify-center h-full px-2 py-3">
                <MuscleDiagram
                  musculoPrincipal={ejercicio.musculoPrincipal}
                  musculosSecundarios={ejercicio.musculosSecundarios ?? []}
                />
              </div>
            ) : hasImg ? (
              hasTwoImgs ? (
                <div className="flex h-full">
                  <div className="flex-1 flex flex-col items-center justify-center gap-1 py-3">
                    <img
                      src={imgUrls[0]}
                      alt={`${ejercicio.nombre} inicio`}
                      onError={() => setImg1Error(true)}
                      style={{ maxHeight: 185, maxWidth: '100%', objectFit: 'contain', padding: '4px 8px' }}
                    />
                    <span className="text-[10px] text-[#8E8E93] font-medium tracking-wide uppercase">Inicio</span>
                  </div>
                  <div className="w-px my-5" style={{ background: `${color}30` }} />
                  <div className="flex-1 flex flex-col items-center justify-center gap-1 py-3">
                    <img
                      src={imgUrls[1]}
                      alt={`${ejercicio.nombre} final`}
                      onError={() => setImg2Error(true)}
                      style={{ maxHeight: 185, maxWidth: '100%', objectFit: 'contain', padding: '4px 8px' }}
                    />
                    <span className="text-[10px] text-[#8E8E93] font-medium tracking-wide uppercase">Final</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={imgUrls[0]}
                    alt={ejercicio.nombre}
                    onError={() => setImg1Error(true)}
                    className="h-full w-auto max-w-full"
                    style={{ objectFit: 'contain', padding: '12px' }}
                  />
                </div>
              )
            ) : null}
          </div>

          {/* Músculos secundarios */}
          {ejercicio.musculosSecundarios?.length > 0 && (
            <div className="px-5 pt-5">
              <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2">También trabaja</p>
              <div className="flex flex-wrap gap-2">
                {ejercicio.musculosSecundarios.map(m => (
                  <span key={m}
                    className="text-xs bg-[#2C2C2E] text-[#AEAEB2] px-3 py-1.5 rounded-full">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {ejercicio.descripcion && (
            <div className="px-5 pt-5">
              <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2">Descripción</p>
              <p className="text-[#EBEBF5] text-sm leading-relaxed">{ejercicio.descripcion}</p>
            </div>
          )}

          {/* Tips */}
          {ejercicio.tips?.length > 0 && (
            <div className="px-5 pt-5">
              <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-3">
                Consejos de ejecución
              </p>
              <div className="flex flex-col gap-2.5">
                {ejercicio.tips.map((tip, i) => (
                  <div
                    key={i}
                    className="flex gap-3 bg-[#2C2C2E] rounded-2xl px-4 py-3.5"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                      style={{ backgroundColor: color + '30', color }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[#EBEBF5] text-sm leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón Agregar al entrenamiento */}
          {onAgregar && (
            <div className="px-5 pt-5">
              <button
                onClick={() => onAgregar(ejercicio)}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-[15px] text-black active:opacity-80"
                style={{ backgroundColor: color }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                     strokeLinecap="round" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Agregar al entrenamiento
              </button>
            </div>
          )}

          {/* Botón YouTube */}
          <div className="px-5 pt-5 pb-8">
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full bg-[#2C2C2E] py-4 rounded-2xl active:opacity-70"
            >
              <svg viewBox="0 0 24 24" fill="#FF0000" width="20" height="20">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
              </svg>
              <span className="text-white font-semibold text-[15px]">Ver tutorial en YouTube</span>
            </a>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
