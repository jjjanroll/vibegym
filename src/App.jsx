import { useState, useEffect } from 'react'
import { saveWorkout, getWorkout, getUser, getAllWorkouts, deleteWorkoutCompleto, getAllTemplates, saveTemplate, saveTemplateExercise, getTemplateExercises, getExercise, saveWorkoutExercise, saveSet } from './db'
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
  const [onboardingCompleto, setOnboardingCompleto] = useState(null)
  const [workoutEnProgreso, setWorkoutEnProgreso] = useState(null) // workout sin fechaFin

  useEffect(() => {
    async function inicializar() {
      const user = await getUser()
      setOnboardingCompleto(!!user)
      if (user) {
        const todos = await getAllWorkouts()
        const enProgreso = todos.find(w => !w.fechaFin)
        if (enProgreso) setWorkoutEnProgreso(enProgreso)
      }
    }
    inicializar()
  }, [])

  if (onboardingCompleto === null) {
    return <div className="bg-black" style={{ height: '100dvh' }} />
  }

  async function iniciarEntrenamiento(templateId = null) {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    let nombre = `Entrenamiento del ${dias[new Date().getDay()]}`

    if (templateId) {
      const templates = await getAllTemplates()
      const t = templates.find(t => t.id === templateId)
      if (t) nombre = t.nombre
    }

    const id = await saveWorkout({
      fechaInicio: new Date().toISOString(),
      fechaFin: null,
      notas: null,
      nombre,
      templateId: templateId ?? null,
    })

    // Pre-poblar ejercicios desde plantilla
    if (templateId) {
      const tes = await getTemplateExercises(templateId)
      for (const te of tes.sort((a,b) => a.orden - b.orden)) {
        const weId = await saveWorkoutExercise({
          workoutId: id,
          exerciseId: te.exerciseId,
          orden: te.orden,
          notas: '',
        })
        // Serie inicial vacía
        await saveSet({
          workoutExerciseId: weId,
          orden: 1,
          peso: null, reps: null, tiempo: null, distancia: null,
          completada: false, notas: null,
        })
      }
    }

    setWorkoutId(id)
  }

  async function terminarEntrenamiento(wId) {
    const workout = await getWorkout(wId)
    setWorkoutId(null)
    setWorkoutResumen(workout)
  }

  async function guardarResumen(plantillaNombre) {
    // Opcionalmente guardar como plantilla
    if (plantillaNombre && workoutResumen) {
      const { getWorkoutExercises } = await import('./db')
      const wes = await getWorkoutExercises(workoutResumen.id)
      const tId = await saveTemplate({
        nombre: plantillaNombre,
        creadoEn: new Date().toISOString(),
      })
      for (const we of wes) {
        await saveTemplateExercise({
          templateId: tId,
          exerciseId: we.exerciseId,
          orden: we.orden,
          seriesDefault: 3,
        })
      }
    }
    setWorkoutResumen(null)
    setTab('historial')
  }

  function cancelarEntrenamiento() {
    setWorkoutId(null)
  }

  async function reanudarWorkout() {
    setWorkoutId(workoutEnProgreso.id)
    setWorkoutEnProgreso(null)
  }

  async function descartarWorkout() {
    await deleteWorkoutCompleto(workoutEnProgreso.id)
    setWorkoutEnProgreso(null)
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
      {/* Modal: entrenamiento en progreso sin terminar */}
      {workoutEnProgreso && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="absolute inset-0 bg-black/70" onClick={() => {}} />
          <div className="relative w-full bg-[#1C1C1E] rounded-t-3xl px-6 pt-6 pb-8 mx-0">
            <div className="w-10 h-1 bg-[#38383A] rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold text-white mb-1">Entrenamiento en progreso</h2>
            <p className="text-[#8E8E93] text-sm mb-6">
              "{workoutEnProgreso.nombre}" fue interrumpido. ¿Qué quieres hacer?
            </p>
            <button
              onClick={reanudarWorkout}
              className="w-full bg-[#30D158] text-black font-bold py-4 rounded-2xl mb-3 active:opacity-80"
            >
              Continuar entrenamiento
            </button>
            <button
              onClick={descartarWorkout}
              className="w-full bg-[#2C2C2E] text-[#FF3B30] font-semibold py-4 rounded-2xl active:opacity-80"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <Screen
          onIniciar={tab === 'entrenar' ? iniciarEntrenamiento : undefined}
        />
      </div>
      <TabBar active={tab} onChange={setTab} />
    </>
  )
}
