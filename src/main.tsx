import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { countVisit } from './hooks/useInstallPrompt'
import './index.css'

// Compté avant le premier rendu : sert à ne pas proposer l'installation
// dès le tout premier lancement.
countVisit()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
