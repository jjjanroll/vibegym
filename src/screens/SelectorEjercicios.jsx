import { useState, useEffect } from 'react'
import { getAllExercises } from '../db'

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

export default function SelectorEjercicios({ onSeleccionar, onCerrar }) {
  const [ejercicios, setEjercicios] = useState([])
  const [categoria, setCategoria] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    getAllExercises().then(todos =>
      setEjercicios(todos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    )
  }, [])

  const filtrados = ejercicios.filter(e => {
    const okCat = categoria === 'Todas' || e.categoria === categoria
    const okTxt = e.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return okCat && okTxt
  })

  return (
    <div className="flex flex-col h-full bg-black">

      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3 gap-3">
        <button onClick={onCerrar} className="text-[#30D158] font-medium text-base shrink-0">
          Cancelar
        </button>
        <h2 className="flex-1 text-center text-white font-semibold text-lg">
          Agregar ejercicio
        </h2>
        <div className="w-16" />
      </div>

      {/* Búsqueda */}
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
            autoFocus
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

      {/* Filtros */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar shrink-0">
        {CATEGORIAS.map(c => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              categoria === c ? 'bg-[#30D158] text-black' : 'bg-[#1C1C1E] text-[#8E8E93]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-8">
        <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#38383A]">
          {filtrados.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#8E8E93]">
              Sin resultados para "{busqueda}"
            </div>
          ) : filtrados.map(e => {
            const s = CATEGORIA_STYLE[e.categoria] ?? { bg: '#8E8E93', text: '?' }
            return (
              <button
                key={e.id}
                onClick={() => onSeleccionar(e)}
                className="w-full px-4 py-3 flex items-center gap-3 active:bg-[#2C2C2E] text-left"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-black"
                  style={{ backgroundColor: s.bg }}
                >
                  {s.text}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-base font-medium leading-tight truncate">{e.nombre}</p>
                  <p className="text-[#8E8E93] text-sm">{e.musculoPrincipal}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="#38383A" strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="shrink-0">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}
