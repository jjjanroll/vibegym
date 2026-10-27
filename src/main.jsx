import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initDB } from './db.js'

// Inicializa la base de datos antes de renderizar.
// Si es la primera vez: crea los 8 stores y carga los 32 ejercicios.
initDB().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
