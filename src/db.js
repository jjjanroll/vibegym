import { openDB } from 'idb'
import ejerciciosBase from './data/exercises.json'

const DB_NAME = 'vibegym'
const DB_VERSION = 2

let dbPromise

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v2: borra y recrea exercises para cargar el catálogo expandido
        if (oldVersion < 2 && db.objectStoreNames.contains('exercises')) {
          db.deleteObjectStore('exercises')
        }
        // 1. user — perfil único del usuario
        if (!db.objectStoreNames.contains('user')) {
          db.createObjectStore('user', { keyPath: 'id' })
        }
        // 2. exercises — biblioteca completa
        if (!db.objectStoreNames.contains('exercises')) {
          const s = db.createObjectStore('exercises', { keyPath: 'id' })
          s.createIndex('categoria', 'categoria')
        }
        // 3. templates — rutinas guardadas
        if (!db.objectStoreNames.contains('templates')) {
          const s = db.createObjectStore('templates', { keyPath: 'id', autoIncrement: true })
          s.createIndex('orden', 'orden')
        }
        // 4. templateExercises — ejercicios dentro de una rutina
        if (!db.objectStoreNames.contains('templateExercises')) {
          const s = db.createObjectStore('templateExercises', { keyPath: 'id', autoIncrement: true })
          s.createIndex('templateId', 'templateId')
        }
        // 5. workouts — sesiones realizadas
        if (!db.objectStoreNames.contains('workouts')) {
          const s = db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true })
          s.createIndex('fechaInicio', 'fechaInicio')
        }
        // 6. workoutExercises — ejercicios dentro de una sesión
        if (!db.objectStoreNames.contains('workoutExercises')) {
          const s = db.createObjectStore('workoutExercises', { keyPath: 'id', autoIncrement: true })
          s.createIndex('workoutId', 'workoutId')
        }
        // 7. sets — series individuales (el corazón de la app)
        if (!db.objectStoreNames.contains('sets')) {
          const s = db.createObjectStore('sets', { keyPath: 'id', autoIncrement: true })
          s.createIndex('workoutExerciseId', 'workoutExerciseId')
        }
        // 8. bodyWeights — registro de peso corporal
        if (!db.objectStoreNames.contains('bodyWeights')) {
          const s = db.createObjectStore('bodyWeights', { keyPath: 'id', autoIncrement: true })
          s.createIndex('fecha', 'fecha')
        }
      },
    })
  }
  return dbPromise
}

// Normaliza los campos del JSON (snake_case → camelCase) al importar
function normalizarEjercicio(e) {
  return {
    id:                  e.id,
    nombre:              e.nombre,
    musculoPrincipal:    e.musculo_principal,
    musculosSecundarios: e.musculos_secundarios,
    equipamiento:        e.equipamiento,
    descripcion:         e.descripcion,
    tips:                e.tips,
    tipo:                e.tipo,
    categoria:           e.categoria,
    esPersonalizado:     false,
    timerSegundos:       null, // null = usar el timer global
  }
}

// ── INICIALIZACIÓN ────────────────────────────────────────────────────────
// Llamar una vez al arrancar la app. Carga los 32 ejercicios base si la DB está vacía.

export async function initDB() {
  const db = await getDB()
  const total = await db.count('exercises')
  if (total === 0) {
    const tx = db.transaction('exercises', 'readwrite')
    await Promise.all([
      ...ejerciciosBase.map(e => tx.store.put(normalizarEjercicio(e))),
      tx.done,
    ])
    console.log(`✓ ${ejerciciosBase.length} ejercicios cargados en la DB`)
  }
  return db
}

// ── USER ──────────────────────────────────────────────────────────────────

export async function getUser() {
  const db = await getDB()
  return db.get('user', 1)
}

export async function saveUser(data) {
  const db = await getDB()
  return db.put('user', { id: 1, ...data })
}

// ── EXERCISES ─────────────────────────────────────────────────────────────

export async function getAllExercises() {
  const db = await getDB()
  return db.getAll('exercises')
}

export async function getExercisesByCategory(categoria) {
  const db = await getDB()
  return db.getAllFromIndex('exercises', 'categoria', categoria)
}

export async function getExercise(id) {
  const db = await getDB()
  return db.get('exercises', id)
}

export async function saveExercise(exercise) {
  if (exercise.id == null) {
    exercise = { ...exercise, id: Date.now() }
  }
  const db = await getDB()
  return db.put('exercises', exercise)
}

export async function deleteExercise(id) {
  const db = await getDB()
  return db.delete('exercises', id)
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────

export async function getAllTemplates() {
  const db = await getDB()
  return db.getAll('templates')
}

export async function getTemplate(id) {
  const db = await getDB()
  return db.get('templates', id)
}

export async function saveTemplate(template) {
  const db = await getDB()
  return db.put('templates', template)
}

export async function deleteTemplate(id) {
  const db = await getDB()
  const tx = db.transaction(['templates', 'templateExercises'], 'readwrite')
  const tes = await tx.objectStore('templateExercises').index('templateId').getAll(id)
  await Promise.all(tes.map(te => tx.objectStore('templateExercises').delete(te.id)))
  await tx.objectStore('templates').delete(id)
  await tx.done
}

export async function getTemplateExercises(templateId) {
  const db = await getDB()
  const items = await db.getAllFromIndex('templateExercises', 'templateId', templateId)
  return items.sort((a, b) => a.orden - b.orden)
}

export async function saveTemplateExercise(item) {
  const db = await getDB()
  return db.put('templateExercises', item)
}

export async function deleteTemplateExercise(id) {
  const db = await getDB()
  return db.delete('templateExercises', id)
}

// ── WORKOUTS ──────────────────────────────────────────────────────────────

export async function getAllWorkouts() {
  const db = await getDB()
  const all = await db.getAllFromIndex('workouts', 'fechaInicio')
  return all.reverse() // más reciente primero
}

export async function getWorkout(id) {
  const db = await getDB()
  return db.get('workouts', id)
}

export async function saveWorkout(workout) {
  const db = await getDB()
  if (workout.id) {
    const existing = await db.get('workouts', workout.id)
    return db.put('workouts', { ...existing, ...workout })
  }
  return db.put('workouts', workout)
}

export async function deleteWorkoutCompleto(workoutId) {
  const db = await getDB()
  const wes = await db.getAllFromIndex('workoutExercises', 'workoutId', workoutId)
  const tx = db.transaction(['workouts', 'workoutExercises', 'sets'], 'readwrite')
  for (const we of wes) {
    const sets = await tx.objectStore('sets').index('workoutExerciseId').getAll(we.id)
    for (const s of sets) tx.objectStore('sets').delete(s.id)
    tx.objectStore('workoutExercises').delete(we.id)
  }
  tx.objectStore('workouts').delete(workoutId)
  await tx.done
}

export async function getWorkoutExercises(workoutId) {
  const db = await getDB()
  const items = await db.getAllFromIndex('workoutExercises', 'workoutId', workoutId)
  return items.sort((a, b) => a.orden - b.orden)
}

export async function saveWorkoutExercise(item) {
  const db = await getDB()
  return db.put('workoutExercises', item)
}

export async function deleteWorkoutExercise(weId) {
  const db = await getDB()
  const tx = db.transaction(['workoutExercises', 'sets'], 'readwrite')
  const sets = await tx.objectStore('sets').index('workoutExerciseId').getAll(weId)
  await Promise.all(sets.map(s => tx.objectStore('sets').delete(s.id)))
  await tx.objectStore('workoutExercises').delete(weId)
  await tx.done
}

// ── SETS ──────────────────────────────────────────────────────────────────

export async function getSets(workoutExerciseId) {
  const db = await getDB()
  const items = await db.getAllFromIndex('sets', 'workoutExerciseId', workoutExerciseId)
  return items.sort((a, b) => a.orden - b.orden)
}

export async function saveSet(set) {
  const db = await getDB()
  return db.put('sets', set)
}

export async function deleteSet(id) {
  const db = await getDB()
  return db.delete('sets', id)
}

// ── BODY WEIGHTS ──────────────────────────────────────────────────────────

export async function getAllBodyWeights() {
  const db = await getDB()
  const all = await db.getAllFromIndex('bodyWeights', 'fecha')
  return all.reverse()
}

export async function saveBodyWeight(entry) {
  const db = await getDB()
  return db.put('bodyWeights', entry)
}

// ── ANTERIOR ──────────────────────────────────────────────────────────────
// Devuelve las series completadas del último entrenamiento donde se usó ese ejercicio.

export async function getLastSetsForExercise(exerciseId, currentWorkoutId) {
  const db = await getDB()
  const allWEs = await db.getAll('workoutExercises')
  const relevantes = allWEs.filter(
    we => we.exerciseId === exerciseId && we.workoutId !== currentWorkoutId
  )
  if (relevantes.length === 0) return []

  const workoutIds = [...new Set(relevantes.map(we => we.workoutId))]
  const workouts = (await Promise.all(workoutIds.map(id => db.get('workouts', id))))
    .filter(w => w?.fechaFin)
    .sort((a, b) => new Date(b.fechaFin) - new Date(a.fechaFin))

  if (workouts.length === 0) return []

  const we = relevantes.find(we => we.workoutId === workouts[0].id)
  if (!we) return []

  const sets = await getSets(we.id)
  return sets
    .filter(s => s.completada && (s.peso || s.reps))
    .sort((a, b) => a.orden - b.orden)
}

// ── PRs — se calculan al vuelo con fórmula Epley ─────────────────────────
// No tienen store propio: se derivan de los sets completados.
// Epley: peso × (1 + reps / 30)

export async function updateEjercicioGif(id, gifUrl) {
  const db = await getDB()
  const e = await db.get('exercises', id)
  if (e) await db.put('exercises', { ...e, gifUrl })
}

export async function getPRForExercise(exerciseId) {
  const db = await getDB()
  const workoutExercises = await db.getAll('workoutExercises')
  const relevant = workoutExercises.filter(we => we.exerciseId === exerciseId)

  let mejor = null
  for (const we of relevant) {
    const sets = await getSets(we.id)
    for (const s of sets) {
      if (!s.completada || !s.peso || !s.reps) continue
      const rm = s.peso * (1 + s.reps / 30)
      if (!mejor || rm > mejor.rm1) {
        mejor = { ...s, rm1: rm, workoutId: we.workoutId }
      }
    }
  }
  return mejor
}

export async function getAllPRs() {
  const db = await getDB()
  const wes = await db.getAll('workoutExercises')
  const allSets = await db.getAll('sets')

  // Agrupar sets por workoutExerciseId
  const setsPorWE = {}
  for (const s of allSets) {
    if (!s.completada || !s.peso || !s.reps) continue
    if (!setsPorWE[s.workoutExerciseId]) setsPorWE[s.workoutExerciseId] = []
    setsPorWE[s.workoutExerciseId].push(s)
  }

  // Calcular mejor 1RM por ejercicio
  const prs = {}
  for (const we of wes) {
    const sets = setsPorWE[we.id] ?? []
    for (const s of sets) {
      const rm = s.peso * (1 + s.reps / 30)
      if (!prs[we.exerciseId] || rm > prs[we.exerciseId].rm1) {
        prs[we.exerciseId] = { ...s, rm1: rm, exerciseId: we.exerciseId }
      }
    }
  }
  return prs // { [exerciseId]: { peso, reps, rm1, ... } }
}

// ── BACKUP ────────────────────────────────────────────────────────────────

export async function importarDatos(json) {
  if (!json || json.version !== 1) throw new Error('Formato de backup inválido o versión incompatible.')
  const campos = ['user', 'workouts', 'workoutExercises', 'sets', 'bodyWeights', 'templates', 'templateExercises']
  for (const c of campos) {
    if (!Array.isArray(json[c])) throw new Error(`El backup está incompleto: falta "${c}".`)
  }

  const db = await getDB()
  const stores = ['user', 'workouts', 'workoutExercises', 'sets', 'bodyWeights', 'templates', 'templateExercises']

  // Limpiar y repoblar cada store en una transacción
  const tx = db.transaction(stores, 'readwrite')
  for (const store of stores) {
    await tx.objectStore(store).clear()
    for (const item of json[store]) {
      tx.objectStore(store).put(item)
    }
  }
  await tx.done
}

// ── RACHA ─────────────────────────────────────────────────────────────────

function getLunes(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekKey(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day + 3) // jueves de la semana ISO
  const year = d.getFullYear()
  const jan4 = new Date(year, 0, 4)
  const weekNum = 1 + Math.round((d - jan4) / (7 * 24 * 60 * 60 * 1000))
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

function getLunesFromKey(key) {
  const [year, wNum] = key.split('-W').map(Number)
  const jan4 = new Date(year, 0, 4)
  const mon1 = new Date(jan4)
  mon1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  mon1.setHours(0, 0, 0, 0)
  const result = new Date(mon1)
  result.setDate(mon1.getDate() + (wNum - 1) * 7)
  return result
}

function semanasSiguiente(key) {
  const lunes = getLunesFromKey(key)
  lunes.setDate(lunes.getDate() + 7)
  return weekKey(lunes)
}

export async function evaluarRacha() {
  const user = await getUser()
  if (!user || !user.modaRacha) return user

  const ahora = new Date()
  const lunesActual = getLunes(ahora)
  const lunesPasado = new Date(lunesActual)
  lunesPasado.setDate(lunesPasado.getDate() - 7)
  const semanaAnteriorKey = weekKey(lunesPasado)

  if (user.ultimaSemanaEvaluada === semanaAnteriorKey) return user

  if (!user.ultimaSemanaEvaluada) {
    const updated = { ...user, ultimaSemanaEvaluada: semanaAnteriorKey }
    await saveUser(updated)
    return updated
  }

  const db = await getDB()
  const todos = await db.getAllFromIndex('workouts', 'fechaInicio')
  const completados = todos.filter(wo => wo.fechaFin)

  let { rachaSemanas = 0, rachaMejor = 0, pases = 0, metaSemanal = 3 } = user
  let paseUsado = false

  // Iterar desde la semana siguiente a ultimaSemanaEvaluada hasta semanaAnteriorKey
  let semActual = semanasSiguiente(user.ultimaSemanaEvaluada)
  while (semActual <= semanaAnteriorKey) {
    const lunes = getLunesFromKey(semActual)
    const domingo = new Date(lunes)
    domingo.setDate(domingo.getDate() + 7)
    domingo.setMilliseconds(-1)

    const enSemana = completados.filter(wo => {
      const f = new Date(wo.fechaFin)
      return f >= lunes && f <= domingo
    })

    if (enSemana.length >= metaSemanal) {
      rachaSemanas++
      if (rachaSemanas > rachaMejor) rachaMejor = rachaSemanas
      if (rachaSemanas % 4 === 0 && pases < 2) pases++
    } else {
      if (pases > 0) {
        pases--
        paseUsado = true
      } else {
        rachaSemanas = 0
      }
    }

    semActual = semanasSiguiente(semActual)
  }

  const updated = { ...user, rachaSemanas, rachaMejor, pases, ultimaSemanaEvaluada: semanaAnteriorKey }
  await saveUser(updated)
  return { ...updated, paseUsado }
}

export { getLunes, weekKey }

export async function exportarDatos() {
  const db = await getDB()
  const [user, workouts, workoutExercises, sets, bodyWeights, templates, templateExercises] =
    await Promise.all([
      db.getAll('user'),
      db.getAll('workouts'),
      db.getAll('workoutExercises'),
      db.getAll('sets'),
      db.getAll('bodyWeights'),
      db.getAll('templates'),
      db.getAll('templateExercises'),
    ])
  return {
    version: 1,
    exportadoEn: new Date().toISOString(),
    user,
    workouts,
    workoutExercises,
    sets,
    bodyWeights,
    templates,
    templateExercises,
  }
}
