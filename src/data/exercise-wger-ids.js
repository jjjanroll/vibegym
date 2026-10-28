// Mapa de nuestro exercise ID → wger.de base_id para ejercicios con imágenes
// Usado en ExerciseDetailSheet para buscar imágenes directamente sin search endpoint
const WGER_IDS = {
  // Pecho
  'press-banca':                 73,
  'press-banca-mancuernas':      75,
  'press-inclinado':             538,
  'press-inclinado-mancuernas':  537,
  'press-declinado':             185,
  'press-agarre-cerrado':        76,
  'aperturas-pecho':             238,   // fly con mancuernas
  'aperturas-inclinadas':        237,   // fly con cable inclinado
  'cruce-poleas':                323,
  'pec-deck':                    135,   // butterfly machine
  'fondos-paralelas':            194,
  'fondos-triceps':              197,   // dips entre bancos
  'pullover-mancuerna':          81,

  // Espalda
  'dominadas':                   475,
  'chin-ups':                    152,
  'remo-barra':                  83,
  'remo-en-t':                   513,
  'remo-polea-baja':             394,
  'hiperextensiones':            301,
  'peso-muerto':                 484,
  'buenos-dias':                 1392,
  'peso-muerto-sumo':            1088,

  // Hombros
  'press-militar':               566,
  'press-hombros-mancuernas':    567,
  'elevaciones-laterales':       348,
  'pajaros':                     487,   // rear delt raises
  'encogimientos-barra':         571,
  'remo-menton':                 694,   // upright row

  // Bíceps
  'curl-biceps':                 92,
  'curl-barra-recta':            91,
  'curl-martillo':               272,
  'curl-predicador':             465,

  // Tríceps
  'press-frances':               246,   // skull crusher / lying triceps press

  // Piernas
  'hack-squat':                  375,
  'leg-curl':                    365,
  'zancadas-caminando':          206,
  'sentadilla-goblet':           203,
  'peso-muerto-rumano':          184,

  // Core
  'crunch':                      167,
  'rueda-abdominal':             1573,
  'elevacion-piernas':           377,

  // Cuerpo completo / Peso corporal
  'flexiones':                   1551,
}

export default WGER_IDS
