import { useState, useEffect } from 'react'
import { saveWorkout, getWorkout, getUser } from './db'
import TabBar from './components/TabBar'
import Entrenar from './screens/Entrenar'
import Historial from './screens/Historial'
import Ejercicios from './screens/Ejercicios'
import Yo from './screens/Yo'
import WorkoutActivo from './screens/WorkoutActivo'
import ResumenWorkout from './screens/ResumenWorkout'
import Onboarding from './screens/Onboarding'

const TABS = {
  entrenar:   Entrenar,
  historial:  Historial,
  ejercicios: Ejercicios,
  yo:         Yo,
}

export default function App() {
  const [tab, setTab] = useState('entrenar')
  const [workoutId, setWorkoutId] = useState(null)
  const [workoutResumen, setWorkoutResumen] = useState(null)
  const [onboardingCompleto, setOnboardingCompleto] = useState(null) // null = cargando

  useEffect(() => {
    getUser().then(user => {
      setOnboardingCompleto(!!user)
    })
  }, [])

  // Mientras cargamos si existe usuario, pantalla negra
  if (onboardingCompleto === null) {
    return <div className="bg-black" style={{ height: '100dvh' }} />
  }

  async function iniciarEntrenamiento() {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const id = await saveWorkout({
      fechaInicio: new Date().toISOString(),
      fechaFin: null,
      notas: null,
      nombre: `Entrenamiento del ${dias[new Date().getDay()]}`,
    })
    setWorkoutId(id)
  }

  async function terminarEntrenamiento(wId) {
    // WorkoutActivo ya guardó el fechaFin — solo lo leemos para el resumen
    const workout = await getWorkout(wId)
    setWorkoutId(null)
    setWorkoutResumen(workout)
  }

  function guardarResumen() {
    setWorkoutResumen(null)
    setTab('historial')
  }

  function cancelarEntrenamiento() {
    setWorkoutId(null)
  }

  const wrapper = (children) => (
    <div
      className="bg-black text-white flex flex-col"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {children}
    </div>
  )

  if (!onboardingCompleto) {
    return wrapper(
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <Onboarding onCompletar={() => setOnboardingCompleto(true)} />
      </div>
    )
  }

  if (workoutId !== null) {
    return wrapper(
      <div className="flex-1 min-h-0">
        <WorkoutActivo
          workoutId={workoutId}
          onTerminar={terminarEntrenamiento}
          onCancelar={cancelarEntrenamiento}
        />
      </div>
    )
  }

  if (workoutResumen !== null) {
    return wrapper(
      <div className="flex-1 min-h-0">
        <ResumenWorkout workout={workoutResumen} onGuardar={guardarResumen} />
      </div>
    )
  }

  const Screen = TABS[tab]
  return wrapper(
    <>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <Screen onIniciar={tab === 'entrenar' ? iniciarEntrenamiento : undefined} />
      </div>
      <TabBar active={tab} onChange={setTab} />
    </>
  )
}
