import { useState } from 'react'
import { saveUser } from '../db'
import DumbbellIcon from '../components/DumbbellIcon'

const OBJETIVOS = [
  { id: 'musculo',   label: 'Ganar músculo',   emoji: '💪' },
  { id: 'fuerza',    label: 'Ganar fuerza',     emoji: '🏋️' },
  { id: 'perder',    label: 'Perder peso',       emoji: '🔥' },
  { id: 'mantener',  label: 'Mantenerme',        emoji: '⚖️' },
]

export default function Onboarding({ onCompletar }) {
  const [paso, setPaso] = useState(0)
  const [datos, setDatos] = useState({
    nombre: '',
    sexo: '',
    fechaNacimiento: '',
    altura: '',
    peso: '',
    objetivo: '',
    diasSemana: 3,
    nivel: '',
  })

  function actualizar(campo, valor) {
    setDatos(d => ({ ...d, [campo]: valor }))
  }

  function siguiente() {
    if (paso < 6) setPaso(p => p + 1)
  }

  function anterior() {
    if (paso > 0) setPaso(p => p - 1)
  }

  async function finalizar() {
    await saveUser({
      id: 1,
      nombre: datos.nombre || 'Atleta',
      sexo: datos.sexo || null,
      fechaNacimiento: datos.fechaNacimiento || null,
      altura: parseFloat(datos.altura) || null,
      peso: parseFloat(datos.peso) || null,
      objetivo: datos.objetivo || null,
      diasSemana: datos.diasSemana,
      nivel: datos.nivel || 'principiante',
      unidad: 'kg',
      timerSegundos: 90,
      metaSemanal: datos.diasSemana,
      rachaMejor: 0,
      rachaActual: 0,
    })
    onCompletar()
  }

  // ── Pantallas ────────────────────────────────────────────────────────────

  const pantallas = [

    // 0 — Bienvenida
    <div key="bienvenida" className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      <div className="w-24 h-24 bg-[#30D158] rounded-[28px] flex items-center justify-center mb-8 shadow-lg">
        <DumbbellIcon size={48} color="#000" />
      </div>
      <h1 className="text-4xl font-bold text-white mb-3">VibeGym</h1>
      <p className="text-[#8E8E93] text-lg leading-relaxed">
        Tu diario de entrenamiento.<br/>Sin suscripción. Sin límites.
      </p>
      <button
        onClick={siguiente}
        className="mt-12 w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80"
      >
        Comenzar
      </button>
    </div>,

    // 1 — Nombre
    <div key="nombre" className="flex flex-col flex-1 px-6 pt-8">
      <h2 className="text-3xl font-bold text-white mb-2">¿Cómo te llamas?</h2>
      <p className="text-[#8E8E93] mb-8">Así te llamaremos en la app</p>
      <input
        type="text"
        value={datos.nombre}
        onChange={e => actualizar('nombre', e.target.value)}
        placeholder="Tu nombre"
        autoFocus
        className="bg-[#1C1C1E] text-white text-xl font-medium px-5 py-4 rounded-2xl outline-none placeholder-[#3A3A3C] w-full"
      />
      <div className="flex-1" />
      <button
        onClick={siguiente}
        className="w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80 mb-4"
      >
        Continuar
      </button>
      <button onClick={siguiente} className="text-[#8E8E93] text-base py-2 text-center">
        Saltar
      </button>
    </div>,

    // 2 — Sexo y fecha de nacimiento
    <div key="cuerpo" className="flex flex-col flex-1 px-6 pt-8">
      <h2 className="text-3xl font-bold text-white mb-2">Tu cuerpo</h2>
      <p className="text-[#8E8E93] mb-6">Opcional — para estadísticas más precisas</p>

      <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Sexo</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[['M', 'Hombre'], ['F', 'Mujer'], ['X', 'Prefiero no decir']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => actualizar('sexo', val)}
            className={`py-3 rounded-xl text-sm font-medium border transition-all ${
              datos.sexo === val
                ? 'bg-[#30D158] border-[#30D158] text-black'
                : 'bg-[#1C1C1E] border-[#38383A] text-white active:opacity-70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Fecha de nacimiento</p>
      <input
        type="date"
        value={datos.fechaNacimiento}
        onChange={e => actualizar('fechaNacimiento', e.target.value)}
        className="bg-[#1C1C1E] text-white px-5 py-4 rounded-2xl outline-none w-full"
        style={{ colorScheme: 'dark' }}
      />

      <div className="flex-1" />
      <button onClick={siguiente} className="w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80 mb-4">
        Continuar
      </button>
      <button onClick={siguiente} className="text-[#8E8E93] text-base py-2 text-center">Saltar</button>
    </div>,

    // 3 — Medidas
    <div key="medidas" className="flex flex-col flex-1 px-6 pt-8">
      <h2 className="text-3xl font-bold text-white mb-2">Tus medidas</h2>
      <p className="text-[#8E8E93] mb-6">Opcional — para calcular calorías y progreso</p>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Altura</p>
          <div className="bg-[#1C1C1E] rounded-2xl px-5 py-4 flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={datos.altura}
              onChange={e => actualizar('altura', e.target.value)}
              placeholder="170"
              className="flex-1 bg-transparent text-white text-xl font-medium outline-none placeholder-[#3A3A3C]"
            />
            <span className="text-[#8E8E93] font-medium">cm</span>
          </div>
        </div>

        <div>
          <p className="text-[#8E8E93] text-xs uppercase tracking-wider mb-2 px-1">Peso actual</p>
          <div className="bg-[#1C1C1E] rounded-2xl px-5 py-4 flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={datos.peso}
              onChange={e => actualizar('peso', e.target.value)}
              placeholder="70"
              className="flex-1 bg-transparent text-white text-xl font-medium outline-none placeholder-[#3A3A3C]"
            />
            <span className="text-[#8E8E93] font-medium">kg</span>
          </div>
        </div>
      </div>

      <div className="flex-1" />
      <button onClick={siguiente} className="w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80 mb-4">
        Continuar
      </button>
      <button onClick={siguiente} className="text-[#8E8E93] text-base py-2 text-center">Saltar</button>
    </div>,

    // 4 — Objetivo
    <div key="objetivo" className="flex flex-col flex-1 px-6 pt-8">
      <h2 className="text-3xl font-bold text-white mb-2">Tu objetivo</h2>
      <p className="text-[#8E8E93] mb-6">Elige lo que más se adapta a ti</p>

      <div className="grid grid-cols-2 gap-3">
        {OBJETIVOS.map(obj => (
          <button
            key={obj.id}
            onClick={() => actualizar('objetivo', obj.id)}
            className={`flex flex-col items-center justify-center py-6 rounded-2xl border-2 transition-all active:scale-95 ${
              datos.objetivo === obj.id
                ? 'bg-[#30D158]/20 border-[#30D158]'
                : 'bg-[#1C1C1E] border-[#38383A]'
            }`}
          >
            <span className="text-3xl mb-2">{obj.emoji}</span>
            <span className={`text-sm font-medium text-center leading-tight ${
              datos.objetivo === obj.id ? 'text-[#30D158]' : 'text-white'
            }`}>{obj.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1" />
      <button
        onClick={siguiente}
        className="w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80 mb-4"
      >
        Continuar
      </button>
    </div>,

    // 5 — Días por semana
    <div key="dias" className="flex flex-col flex-1 px-6 pt-8">
      <h2 className="text-3xl font-bold text-white mb-2">¿Cuántos días?</h2>
      <p className="text-[#8E8E93] mb-8">¿Cuántos días a la semana quieres entrenar?</p>

      <div className="grid grid-cols-3 gap-3">
        {[2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            onClick={() => actualizar('diasSemana', n)}
            className={`py-5 rounded-2xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${
              datos.diasSemana === n
                ? 'bg-[#30D158]/20 border-[#30D158]'
                : 'bg-[#1C1C1E] border-[#38383A]'
            }`}
          >
            <span className={`text-3xl font-bold ${datos.diasSemana === n ? 'text-[#30D158]' : 'text-white'}`}>{n}</span>
            <span className="text-[#8E8E93] text-xs mt-1">días</span>
          </button>
        ))}
      </div>

      <div className="flex-1" />
      <button
        onClick={siguiente}
        className="w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80 mb-4"
      >
        Continuar
      </button>
    </div>,

    // 6 — Nivel de experiencia
    <div key="nivel" className="flex flex-col flex-1 px-6 pt-8">
      <h2 className="text-3xl font-bold text-white mb-2">Tu nivel</h2>
      <p className="text-[#8E8E93] mb-8">¿Cuánta experiencia tienes entrenando?</p>

      <div className="flex flex-col gap-3">
        {[
          { id: 'principiante', label: 'Principiante', desc: 'Menos de 1 año entrenando', emoji: '🌱' },
          { id: 'intermedio',   label: 'Intermedio',   desc: '1 a 3 años entrenando',    emoji: '💪' },
          { id: 'avanzado',     label: 'Avanzado',     desc: 'Más de 3 años entrenando', emoji: '🏆' },
        ].map(niv => (
          <button
            key={niv.id}
            onClick={() => actualizar('nivel', niv.id)}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-95 ${
              datos.nivel === niv.id
                ? 'bg-[#30D158]/20 border-[#30D158]'
                : 'bg-[#1C1C1E] border-[#38383A]'
            }`}
          >
            <span className="text-3xl">{niv.emoji}</span>
            <div className="text-left">
              <p className={`font-semibold text-base ${datos.nivel === niv.id ? 'text-[#30D158]' : 'text-white'}`}>{niv.label}</p>
              <p className="text-[#8E8E93] text-sm">{niv.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1" />
      <button
        onClick={finalizar}
        className="w-full bg-[#30D158] text-black font-bold text-lg py-4 rounded-2xl active:opacity-80 mb-4"
      >
        ¡Empezar!
      </button>
    </div>,
  ]

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>

      {/* Indicador de progreso + botón atrás */}
      <div className="shrink-0 px-6 pt-4 pb-2">
        {paso > 0 && (
          <button onClick={anterior} className="text-[#30D158] mb-4 flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                 strokeLinecap="round" width="18" height="18"><path d="M15 18l-6-6 6-6"/></svg>
            Atrás
          </button>
        )}
        {/* Barra de progreso */}
        <div className="flex gap-1.5">
          {[0,1,2,3,4,5,6].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= paso ? 'bg-[#30D158]' : 'bg-[#2C2C2E]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Contenido de la pantalla actual */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col"
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
        {pantallas[paso]}
      </div>
    </div>
  )
}
