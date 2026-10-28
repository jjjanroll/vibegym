const BASE_FRONT = 'https://wger.de/static/images/muscles/muscular_system_front.svg'
const BASE_BACK  = 'https://wger.de/static/images/muscles/muscular_system_back.svg'
const mainUrl = id => `https://wger.de/static/images/muscles/main/muscle-${id}.svg`
const secUrl  = id => `https://wger.de/static/images/muscles/secondary/muscle-${id}.svg`

// wger.de muscle IDs + which body view they appear on
const MUSCLE_MAP = {
  // Pecho
  'Pecho':                                  { ids: [4],     vista: 'frente' },
  'Pecho superior':                         { ids: [4],     vista: 'frente' },
  'Pecho inferior':                         { ids: [4],     vista: 'frente' },
  // Espalda
  'Espalda':                                { ids: [12],    vista: 'espalda' },
  'Espalda (dorsal)':                       { ids: [12],    vista: 'espalda' },
  'Dorsal':                                 { ids: [12],    vista: 'espalda' },
  'Espalda baja':                           { ids: [15],    vista: 'espalda' },
  'Espalda baja (erector espinal)':         { ids: [15],    vista: 'espalda' },
  'Erector espinal':                        { ids: [15],    vista: 'espalda' },
  'Romboides':                              { ids: [14],    vista: 'espalda' },
  'Trapecio':                               { ids: [14],    vista: 'espalda' },
  'Trapecio medio':                         { ids: [14],    vista: 'espalda' },
  'Elevador de la escápula':                { ids: [14],    vista: 'espalda' },
  // Hombros
  'Hombros':                                { ids: [2],     vista: 'frente' },
  'Hombros (deltoides)':                    { ids: [2],     vista: 'frente' },
  'Hombros (deltoides anterior)':           { ids: [2],     vista: 'frente' },
  'Hombros (deltoides anterior y medial)':  { ids: [2],     vista: 'frente' },
  'Hombros (deltoides medial)':             { ids: [2],     vista: 'frente' },
  'Hombros anteriores':                     { ids: [2],     vista: 'frente' },
  'Deltoides medial':                       { ids: [2],     vista: 'frente' },
  'Deltoides posterior':                    { ids: [2],     vista: 'espalda' },
  'Manguito rotador':                       { ids: [2],     vista: 'espalda' },
  // Brazos - frente
  'Bíceps':                                 { ids: [1],     vista: 'frente' },
  'Bíceps (cabeza larga)':                  { ids: [1],     vista: 'frente' },
  'Braquial':                               { ids: [6],     vista: 'frente' },
  'Braquiorradial':                         { ids: [7],     vista: 'frente' },
  'Extensores del antebrazo':               { ids: [7],     vista: 'frente' },
  // Brazos - espalda
  'Tríceps':                                { ids: [5],     vista: 'espalda' },
  'Tríceps (cabeza larga)':                 { ids: [5],     vista: 'espalda' },
  // Core / abdomen
  'Core':                                   { ids: [6],     vista: 'frente' },
  'Core (transverso abdominal)':            { ids: [6],     vista: 'frente' },
  'Recto abdominal':                        { ids: [6],     vista: 'frente' },
  'Recto abdominal inferior':               { ids: [6],     vista: 'frente' },
  'Oblicuos':                               { ids: [3],     vista: 'frente' },
  // Piernas - frente
  'Cuádriceps':                             { ids: [10],    vista: 'frente' },
  'Aductores':                              { ids: [10],    vista: 'frente' },
  'Flexores de cadera':                     { ids: [10],    vista: 'frente' },
  'TFL':                                    { ids: [10],    vista: 'frente' },
  'Piernas':                                { ids: [10, 11], vista: 'ambos' },
  // Piernas - espalda
  'Isquiotibiales':                         { ids: [11],    vista: 'espalda' },
  'Glúteos':                                { ids: [8],     vista: 'espalda' },
  'Glúteo medio':                           { ids: [8],     vista: 'espalda' },
  'Glúteo menor':                           { ids: [8],     vista: 'espalda' },
  'Grácil':                                 { ids: [8],     vista: 'espalda' },
  'Pectíneo':                               { ids: [10],    vista: 'frente' },
  // Piernas - ambas vistas
  'Gastrocnemio':                           { ids: [9],     vista: 'espalda' },
  'Sóleo':                                  { ids: [15],    vista: 'espalda' },
  'Pantorrillas':                           { ids: [9],     vista: 'espalda' },
}

const overlayStyle = {
  position: 'absolute',
  top: 0, left: 0,
  width: '100%', height: '100%',
  objectFit: 'contain',
}

export default function MuscleDiagram({ musculoPrincipal, musculosSecundarios = [] }) {
  // Build sets of muscle IDs for each view
  const frente = { main: [], sec: [] }
  const espalda = { main: [], sec: [] }

  function add(muscleName, target) {
    const entry = MUSCLE_MAP[muscleName]
    if (!entry) return
    const { ids, vista } = entry
    if (vista === 'frente' || vista === 'ambos') {
      ids.forEach(id => { if (!target.frente.includes(id)) target.frente.push(id) })
    }
    if (vista === 'espalda' || vista === 'ambos') {
      ids.forEach(id => { if (!target.espalda.includes(id)) target.espalda.push(id) })
    }
  }

  // Primary muscle
  if (musculoPrincipal) {
    const entry = MUSCLE_MAP[musculoPrincipal]
    if (entry) {
      const { ids, vista } = entry
      if (vista === 'frente' || vista === 'ambos') ids.forEach(id => frente.main.push(id))
      if (vista === 'espalda' || vista === 'ambos') ids.forEach(id => espalda.main.push(id))
    }
  }

  // Secondary muscles
  ;(musculosSecundarios ?? []).forEach(m => {
    const entry = MUSCLE_MAP[m]
    if (!entry) return
    const { ids, vista } = entry
    if (vista === 'frente' || vista === 'ambos') {
      ids.forEach(id => { if (!frente.main.includes(id) && !frente.sec.includes(id)) frente.sec.push(id) })
    }
    if (vista === 'espalda' || vista === 'ambos') {
      ids.forEach(id => { if (!espalda.main.includes(id) && !espalda.sec.includes(id)) espalda.sec.push(id) })
    }
  })

  const labelStyle = {
    color: '#636366',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  }

  return (
    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-end', padding: '8px 4px' }}>
      {/* Frente */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ position: 'relative', width: 90, height: 200 }}>
          <img src={BASE_FRONT} alt="frente" style={{ ...overlayStyle, objectFit: 'contain' }} />
          {frente.main.map(id => (
            <img key={`fm-${id}`} src={mainUrl(id)} alt="" style={overlayStyle} />
          ))}
          {frente.sec.map(id => (
            <img key={`fs-${id}`} src={secUrl(id)} alt="" style={overlayStyle} />
          ))}
        </div>
        <span style={labelStyle}>Frente</span>
      </div>

      {/* Espalda */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ position: 'relative', width: 90, height: 200 }}>
          <img src={BASE_BACK} alt="espalda" style={{ ...overlayStyle, objectFit: 'contain' }} />
          {espalda.main.map(id => (
            <img key={`em-${id}`} src={mainUrl(id)} alt="" style={overlayStyle} />
          ))}
          {espalda.sec.map(id => (
            <img key={`es-${id}`} src={secUrl(id)} alt="" style={overlayStyle} />
          ))}
        </div>
        <span style={labelStyle}>Espalda</span>
      </div>
    </div>
  )
}
