// URLs directas de imágenes de wger.de — sin API calls
// p(url) genera array [inicio, final] para URLs con patrón -1.ext
const p = url => [url, url.replace(/-1\./, '-2.')]

const EXERCISE_IMAGES = {
  // Pecho
  'press-banca':                p('https://wger.de/media/exercise-images/192/Bench-press-1.png'),
  'press-banca-mancuernas':     p('https://wger.de/media/exercise-images/97/Dumbbell-bench-press-1.png'),
  'press-inclinado':            p('https://wger.de/media/exercise-images/41/Incline-bench-press-1.png'),
  'press-inclinado-mancuernas': p('https://wger.de/media/exercise-images/16/Incline-press-1.png'),
  'press-declinado':            p('https://wger.de/media/exercise-images/100/Decline-bench-press-1.png'),
  'press-agarre-cerrado':       p('https://wger.de/media/exercise-images/88/Narrow-grip-bench-press-1.png'),
  'aperturas-pecho':            'https://wger.de/media/exercise-images/238/2fc242d3-5bdd-4f97-99bd-678adb8c96fc.png',
  'aperturas-inclinadas':       p('https://wger.de/media/exercise-images/122/Incline-cable-flyes-1.png'),
  'cruce-poleas':               'https://wger.de/media/exercise-images/71/Cable-crossover-2.png',
  'pec-deck':                   'https://wger.de/media/exercise-images/98/Butterfly-machine-2.png',
  'fondos-paralelas':           'https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png',
  'fondos-triceps':             p('https://wger.de/media/exercise-images/83/Bench-dips-1.png'),
  'pullover-mancuerna':         p('https://wger.de/media/exercise-images/81/Biceps-curl-1.png'),

  // Espalda
  'dominadas':                  'https://wger.de/media/exercise-images/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg',
  'chin-ups':                   'https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png',
  'remo-barra':                 p('https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png'),
  'remo-en-t':                  p('https://wger.de/media/exercise-images/106/T-bar-row-1.png'),
  'peso-muerto':                'https://wger.de/media/exercise-images/161/Dead-lifts-2.png',
  'buenos-dias':                'https://wger.de/media/exercise-images/1392/a02c9c7d-f42d-43e0-9946-1b99b014daee.png',
  'peso-muerto-sumo':           'https://wger.de/media/exercise-images/1088/9f66b288-ce8f-4154-ba80-78fee267263c.jpg',

  // Hombros
  'press-militar':              p('https://wger.de/media/exercise-images/119/seated-barbell-shoulder-press-large-1.png'),
  'press-hombros-mancuernas':   p('https://wger.de/media/exercise-images/123/dumbbell-shoulder-press-large-1.png'),
  'elevaciones-laterales':      'https://wger.de/media/exercise-images/148/lateral-dumbbell-raises-large-2.png',
  'pajaros':                    'https://wger.de/media/exercise-images/487/ad724e5c-b1ed-49e8-9279-a17545b0dd0b.png',
  'encogimientos-barra':        p('https://wger.de/media/exercise-images/150/Barbell-shrugs-1.png'),
  'remo-menton':                'https://wger.de/media/exercise-images/694/119e6823-6960-4341-a9e1-aaf78d7fb57c.png',

  // Bíceps
  'curl-biceps':                p('https://wger.de/media/exercise-images/81/Biceps-curl-1.png'),
  'curl-barra-recta':           p('https://wger.de/media/exercise-images/74/Bicep-curls-1.png'),
  'curl-martillo':              p('https://wger.de/media/exercise-images/86/Bicep-hammer-curl-1.png'),
  'curl-predicador':            p('https://wger.de/media/exercise-images/193/Preacher-curl-3-1.png'),

  // Tríceps
  'press-frances':              p('https://wger.de/media/exercise-images/84/Lying-close-grip-triceps-press-to-chin-1.png'),

  // Piernas
  'hack-squat':                 'https://wger.de/media/exercise-images/130/Narrow-stance-hack-squats-1-1024x721.png',
  'leg-curl':                   p('https://wger.de/media/exercise-images/154/lying-leg-curl-machine-large-1.png'),
  'zancadas-caminando':         p('https://wger.de/media/exercise-images/113/Walking-lunges-1.png'),
  'sentadilla-goblet':          'https://wger.de/media/exercise-images/203/1c052351-2af0-4227-aeb0-244008e4b0a8.jpeg',
  'peso-muerto-rumano':         'https://wger.de/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg',

  // Core
  'crunch':                     p('https://wger.de/media/exercise-images/91/Crunches-1.png'),
  'elevacion-piernas':          'https://wger.de/media/exercise-images/125/Leg-raises-2.png',

  // Cuerpo completo
  'flexiones':                  'https://wger.de/media/exercise-images/1086/b2ee8d9b-0480-4992-8494-c223b37c2696.jpg',
}

export default EXERCISE_IMAGES
